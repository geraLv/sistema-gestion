import { supabase } from '../db';
import * as fs from 'fs';
import * as readline from 'readline';

const CSV_PATH = 'C:/Users/ING Nordeste/Desktop/repos/sistema-gestion/sistema-migrado/DOC PROGRAMADOR.csv';

const csvCuotas = new Map<number, Map<number, any>>();

async function loadCsvDada() {
    console.log("📂 Leyendo CSV (esto puede tomar 30 segundos)...");
    const fileStream = fs.createReadStream(CSV_PATH);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let inCuotasSection = false;
    let count = 0;

    for await (const line of rl) {
        if (line.includes('idcuota') && line.includes('relasolicitud')) {
            inCuotasSection = true;
            continue;
        }

        if (inCuotasSection) {
            const parts = line.split(',');
            if (parts.length >= 8) {
                const cleanParts = parts.map(p => p.replace(/"/g, ''));

                const idcuota = Number(cleanParts[0]);
                if (isNaN(idcuota)) continue;

                const relasolicitud = Number(cleanParts[1]);
                const nrocuota = Number(cleanParts[2]);
                const importe = Number(cleanParts[3]);
                const fecha = cleanParts[4] || null;
                const estado = Number(cleanParts[7]);

                if (!csvCuotas.has(relasolicitud)) {
                    csvCuotas.set(relasolicitud, new Map());
                }
                csvCuotas.get(relasolicitud)!.set(nrocuota, { importe, fecha, estado });
                count++;
            }
        }
    }

    console.log(`✅ CSV cargado: ${count} cuotas históricas en memoria.`);
}

async function getAuditedCuotasIds(): Promise<Set<number>> {
    console.log("\n🔍 Obteniendo IDs de cuotas modificadas en producción (audit_log)...");
    const ids = new Set<number>();

    let offset = 0;
    while (true) {
        const { data, error } = await supabase
            .from('audit_log')
            .select('entity_id')
            .eq('entity', 'cuotas')
            .range(offset, offset + 999);

        if (error) {
            console.error("Error leyendo audit_log:", error.message);
            break;
        }

        if (!data || data.length === 0) break;

        for (const row of data) {
            const id = Number(row.entity_id);
            if (!isNaN(id)) ids.add(id);
        }

        if (data.length < 1000) break;
        offset += 1000;
    }

    console.log(`✅ Se encontraron ${ids.size} cuotas únicas tocadas en producción.`);
    return ids;
}

async function syncCuotasWithAudit() {
    await loadCsvDada();
    const auditedCuotas = await getAuditedCuotasIds();

    console.log("\n🔄 Iniciando Sincronización Y ACTUALIZACIÓN EN BASE DE DATOS...");

    let solicitudesIds: number[] = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase
            .from('solicitud')
            .select('idsolicitud')
            .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        solicitudesIds = solicitudesIds.concat(data.map(d => d.idsolicitud));
        if (data.length < 1000) break;
        page++;
    }

    console.log(`📋 Total de solicitudes en DB a revisar: ${solicitudesIds.length}`);

    let stats = {
        revisadas: 0,
        falsosPagadosFixeados: 0,
        pagadasFaltantesFixeadas: 0,
        pagosNuevosRespetados: 0,
        errores: 0
    };

    for (let i = 0; i < solicitudesIds.length; i += 50) {
        const batchIds = solicitudesIds.slice(i, i + 50);

        const { data: dbCuotas, error } = await supabase
            .from('cuotas')
            .select('idcuota, relasolicitud, nrocuota, estado, fecha')
            .in('relasolicitud', batchIds);

        if (error) {
            console.error(`❌ Error leyendo cuotas en batch: ${error.message}`);
            stats.errores += batchIds.length;
            continue;
        }

        const cuotasBySol = new Map<number, any[]>();
        for (const dbCuota of dbCuotas || []) {
            if (!cuotasBySol.has(dbCuota.relasolicitud)) {
                cuotasBySol.set(dbCuota.relasolicitud, []);
            }
            cuotasBySol.get(dbCuota.relasolicitud)!.push(dbCuota);
        }

        for (const solId of batchIds) {
            const myCuotas = cuotasBySol.get(solId) || [];
            const historialCsv = csvCuotas.get(solId);

            if (!historialCsv) {
                stats.revisadas++;
                continue;
            }

            const updates: any[] = [];

            for (const dbCuota of myCuotas) {
                const csvCuota = historialCsv.get(dbCuota.nrocuota);
                if (!csvCuota) continue;

                if (csvCuota.estado === 2 && dbCuota.estado === 0) {
                    updates.push({
                        idcuota: dbCuota.idcuota,
                        estado: 2,
                        fecha: csvCuota.fecha || null
                    });
                    stats.pagadasFaltantesFixeadas++;
                }
                else if (csvCuota.estado === 0 && dbCuota.estado === 2) {
                    // AQUÍ ESTÁ LA MAGIA:
                    // Si el idcuota ESTÁ en la lista de audit_log, es un pago real en producción
                    // Si NO ESTÁ, es un falso pagado provocado por el script de importación inicial
                    const isRealPaymentInProd = auditedCuotas.has(dbCuota.idcuota);

                    if (!isRealPaymentInProd) {
                        updates.push({
                            idcuota: dbCuota.idcuota,
                            estado: 0,
                            fecha: null
                        });
                        stats.falsosPagadosFixeados++;
                    } else {
                        stats.pagosNuevosRespetados++;
                    }
                }
            }

            if (updates.length > 0) {
                for (const upsert of updates) {
                    const { error: errUp } = await supabase
                        .from('cuotas')
                        .update(upsert)
                        .eq('idcuota', upsert.idcuota);
                    if (errUp) console.error(`❌ Error update idcuota ${upsert.idcuota}:`, errUp.message);
                }
            }

            stats.revisadas++;
        }

        const pct = Math.round(stats.revisadas / solicitudesIds.length * 100);
        process.stdout.write(`\r  🔄 Progreso: ${stats.revisadas}/${solicitudesIds.length} solicitudes... (${pct}%)`);

        await new Promise(r => setTimeout(r, 100)); // rate limit
    }

    console.log(`\n\n✅ Sincronización Finalizada Y APLICADA A LA BASE DE DATOS`);
    console.log(`─────────────────────────────────────────`);
    console.log(`🔧 Falsos pagados revertidos: ${stats.falsosPagadosFixeados}`);
    console.log(`🔧 Cuotas pagadas faltantes aplicadas: ${stats.pagadasFaltantesFixeadas}`);
    console.log(`💎 Pagos reales recientes (Audit Log) respetados: ${stats.pagosNuevosRespetados}`);
    console.log(`❌ Errores de DB durante guardado: ${stats.errores}`);
}

syncCuotasWithAudit().catch(err => console.error(err));
