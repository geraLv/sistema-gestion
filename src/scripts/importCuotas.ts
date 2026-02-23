
import { supabase } from '../db';

const BATCH_SIZE = 50;

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function importCuotas() {
    console.log("📅 Iniciando generación de cuotas desde datos de solicitudes...\n");

    // 1. Load all solicitudes that have cuota data
    let allSolicitudes: any[] = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase
            .from('solicitud')
            .select('idsolicitud, nrosolicitud, fechalta, cantidadcuotas, totalapagar, totalabonado, porcentajepagado')
            .gt('cantidadcuotas', 0)
            .gt('totalapagar', 0)
            .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        allSolicitudes = allSolicitudes.concat(data);
        if (data.length < 1000) break;
        page++;
    }
    console.log(`📋 Total solicitudes con cuotas: ${allSolicitudes.length}\n`);

    // 2. Get ALL solicitudes that already have cuotas (paginated)
    const solicitudesConCuotas = new Set<number>();
    let cuotaPage = 0;
    while (true) {
        const { data: existingCuotas } = await supabase
            .from('cuotas')
            .select('relasolicitud')
            .range(cuotaPage * 1000, (cuotaPage + 1) * 1000 - 1);
        if (!existingCuotas || existingCuotas.length === 0) break;
        existingCuotas.forEach(c => solicitudesConCuotas.add(c.relasolicitud));
        if (existingCuotas.length < 1000) break;
        cuotaPage++;
    }
    const pendientes = allSolicitudes.filter(s => !solicitudesConCuotas.has(s.idsolicitud));
    console.log(`✅ Ya tienen cuotas:   ${allSolicitudes.length - pendientes.length}`);
    console.log(`🆕 A generar:          ${pendientes.length}\n`);

    let creadas = 0, errores = 0;

    // Process in batches
    for (let i = 0; i < pendientes.length; i += BATCH_SIZE) {
        const batch = pendientes.slice(i, i + BATCH_SIZE);
        const records: any[] = [];

        for (const sol of batch) {
            const cant = sol.cantidadcuotas;
            const total = sol.totalapagar;
            const pagado = sol.totalabonado || 0;

            // Determine base date: use fechalta if available, otherwise today
            const fechaBase = sol.fechalta
                ? new Date(sol.fechalta)
                : new Date();

            // Per-cuota amount (evenly split)
            const importePorCuota = Math.round(total / cant);

            // Number of paid cuotas: derived from totalabonado / importe_cuota
            // Use round to handle minor float discrepancies
            const cuotasPagadas = pagado > 0 && importePorCuota > 0
                ? Math.min(Math.round(pagado / importePorCuota), cant)
                : 0;

            for (let n = 1; n <= cant; n++) {
                const venc = new Date(fechaBase);
                venc.setMonth(venc.getMonth() + n);
                const vencStr = venc.toISOString().split('T')[0];

                const esPagada = n <= cuotasPagadas;
                records.push({
                    relasolicitud: sol.idsolicitud,
                    nrocuota: n,
                    importe: importePorCuota,
                    vencimiento: vencStr,
                    estado: esPagada ? 2 : 0,
                    fecha: esPagada ? vencStr : null, // fecha de pago = mismo vencimiento (dato no disponible)
                    saldoanterior: esPagada ? importePorCuota : null,
                });
            }
        }

        // Insert all records in this batch
        const { error: insertErr } = await supabase.from('cuotas').insert(records);
        if (insertErr) {
            console.error(`❌ Error en lote [${i}..${i + batch.length - 1}]: ${insertErr.message}`);
            errores += batch.length;
        } else {
            creadas += records.length;
            const pct = Math.round((i + batch.length) / pendientes.length * 100);
            process.stdout.write(`\r  🔄 Progreso: ${i + batch.length}/${pendientes.length} solicitudes (${pct}%) — ${creadas} cuotas generadas`);
        }

        await sleep(100); // rate limit
    }

    console.log(`\n\n─────────────────────────────────────────`);
    console.log(`✅ Cuotas generadas:       ${creadas}`);
    console.log(`❌ Solicitudes con error:  ${errores}`);
    console.log(`⏭️  Ya tenían cuotas:      ${allSolicitudes.length - pendientes.length}`);
}

importCuotas().catch(err => console.error("Error fatal:", err.message));
