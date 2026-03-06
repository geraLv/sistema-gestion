import { supabase } from '../db';

/**
 * Script de auditoría: Detecta solicitudes donde la cantidad de cuotas
 * marcadas como pagadas (estado=2) en la BD no coincide con lo esperado
 * según totalabonado / importePorCuota.
 *
 * El bug original en importCuotas.ts usaba Math.round() que podía
 * redondear hacia arriba, marcando cuotas de más como pagadas.
 */

async function auditCuotasPagadas() {
    console.log("🔍 Auditoría de cuotas pagadas vs totalabonado...\n");

    // 1. Cargar todas las solicitudes con cuotas (paginado)
    let allSolicitudes: any[] = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase
            .from('solicitud')
            .select('idsolicitud, nrosolicitud, cantidadcuotas, totalapagar, totalabonado, porcentajepagado, estado')
            .gt('cantidadcuotas', 0)
            .gt('totalapagar', 0)
            .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        allSolicitudes = allSolicitudes.concat(data);
        if (data.length < 1000) break;
        page++;
    }
    console.log(`📋 Total solicitudes analizadas: ${allSolicitudes.length}\n`);

    // 2. Para cada solicitud, contar cuotas pagadas reales en la BD
    const discrepancias: any[] = [];
    let procesadas = 0;

    for (let i = 0; i < allSolicitudes.length; i += 50) {
        const batch = allSolicitudes.slice(i, i + 50);

        for (const sol of batch) {
            // Contar cuotas pagadas reales en la BD
            const { count: cuotasPagadasDB, error: errCount } = await supabase
                .from('cuotas')
                .select('idcuota', { count: 'exact', head: true })
                .eq('relasolicitud', sol.idsolicitud)
                .eq('estado', 2);

            if (errCount) {
                console.error(`❌ Error contando cuotas para solicitud ${sol.nrosolicitud}: ${errCount.message}`);
                continue;
            }

            const pagadasEnDB = cuotasPagadasDB || 0;

            // Calcular cuotas esperadas según totalabonado
            const importePorCuota = Math.round(sol.totalapagar / sol.cantidadcuotas);
            const pagado = sol.totalabonado || 0;

            // Usar Math.floor (el correcto) para calcular cuántas deberían estar pagadas
            const cuotasEsperadas = pagado > 0 && importePorCuota > 0
                ? Math.min(Math.floor(pagado / importePorCuota), sol.cantidadcuotas)
                : 0;

            // También calcular con Math.round (el que usó el import) para verificar
            const cuotasConRound = pagado > 0 && importePorCuota > 0
                ? Math.min(Math.round(pagado / importePorCuota), sol.cantidadcuotas)
                : 0;

            if (pagadasEnDB !== cuotasEsperadas) {
                const diferencia = pagadasEnDB - cuotasEsperadas;
                discrepancias.push({
                    nrosolicitud: sol.nrosolicitud,
                    idsolicitud: sol.idsolicitud,
                    estadoSolicitud: sol.estado,
                    cantidadcuotas: sol.cantidadcuotas,
                    totalapagar: sol.totalapagar,
                    totalabonado: pagado,
                    importePorCuota,
                    pagadasEnDB,
                    cuotasEsperadas,
                    cuotasConRound,
                    diferencia,
                    tipo: diferencia > 0 ? '⚠️ PAGADAS DE MÁS' : '⚠️ PAGADAS DE MENOS',
                });
            }
        }

        procesadas += batch.length;
        const pct = Math.round(procesadas / allSolicitudes.length * 100);
        process.stdout.write(`\r  🔄 Progreso: ${procesadas}/${allSolicitudes.length} (${pct}%)`);

        // Rate limit
        await new Promise(r => setTimeout(r, 100));
    }

    console.log('\n');

    // 3. Mostrar resultados
    if (discrepancias.length === 0) {
        console.log("✅ No se encontraron discrepancias. Todas las cuotas están correctas.");
        return;
    }

    console.log(`⚠️  Se encontraron ${discrepancias.length} solicitudes con discrepancias:\n`);
    console.log('─'.repeat(120));
    console.log(
        'Nro Solicitud'.padEnd(15) +
        'ID'.padEnd(8) +
        'Estado'.padEnd(8) +
        'Cuotas'.padEnd(8) +
        'TotalAPagar'.padEnd(14) +
        'Abonado'.padEnd(14) +
        'Imp/Cuota'.padEnd(12) +
        'PagadasDB'.padEnd(12) +
        'Esperadas'.padEnd(12) +
        'Diferencia'.padEnd(12) +
        'Tipo'
    );
    console.log('─'.repeat(120));

    const pagadasDeMas = discrepancias.filter(d => d.diferencia > 0);
    const pagadasDeMenos = discrepancias.filter(d => d.diferencia < 0);

    for (const d of discrepancias) {
        console.log(
            String(d.nrosolicitud).padEnd(15) +
            String(d.idsolicitud).padEnd(8) +
            String(d.estadoSolicitud).padEnd(8) +
            String(d.cantidadcuotas).padEnd(8) +
            String(d.totalapagar).padEnd(14) +
            String(d.totalabonado).padEnd(14) +
            String(d.importePorCuota).padEnd(12) +
            String(d.pagadasEnDB).padEnd(12) +
            String(d.cuotasEsperadas).padEnd(12) +
            String(d.diferencia > 0 ? '+' : '').concat(String(d.diferencia)).padEnd(12) +
            d.tipo
        );
    }

    console.log('─'.repeat(120));
    console.log(`\n📊 Resumen:`);
    console.log(`   Total discrepancias:     ${discrepancias.length}`);
    console.log(`   Pagadas de más:          ${pagadasDeMas.length}`);
    console.log(`   Pagadas de menos:        ${pagadasDeMenos.length}`);
    console.log(`   Total cuotas sobrantes:  ${pagadasDeMas.reduce((acc, d) => acc + d.diferencia, 0)}`);
}

auditCuotasPagadas().catch(err => console.error("Error fatal:", err.message));
