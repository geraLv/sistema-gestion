import { supabase } from '../db';

/**
 * Script para recalcular 'totalabonado' y 'porcentajepagado' de TODAS las solicitudes
 * basándose en el importe de sus cuotas con estado=2 (pagadas).
 * Optimizado: hace una sola consulta de cuotas pagadas y actualiza en lotes.
 */
async function fixTotalesSolicitudes() {
    console.log("🔧 Recalculando totales y porcentajes de TODAS las solicitudes (Bulk Mode)...\n");

    // 1. Obtener todas las cuotas pagadas y agrupar por solicitud
    console.log("⏳ Descargando cuotas pagadas...");
    let allCuotasPagadas: any[] = [];
    let pageC = 0;
    while (true) {
        const { data, error } = await supabase
            .from('cuotas')
            .select('relasolicitud, importe')
            .eq('estado', 2)
            .range(pageC * 1000, (pageC + 1) * 1000 - 1);

        if (error) {
            console.error("Error fetching cuotas:", error.message);
            break;
        }
        if (!data || data.length === 0) break;
        allCuotasPagadas = allCuotasPagadas.concat(data);
        if (data.length < 1000) break;
        pageC++;
    }

    const pagosPorSolicitud = new Map<number, number>();
    for (const c of allCuotasPagadas) {
        const actual = pagosPorSolicitud.get(c.relasolicitud) || 0;
        pagosPorSolicitud.set(c.relasolicitud, actual + (c.importe || 0));
    }
    console.log(`✅ ${allCuotasPagadas.length} cuotas pagadas cargadas.\n`);

    // 2. Obtener todas las solicitudes
    console.log("⏳ Descargando solicitudes...");
    let allSolicitudes: any[] = [];
    let pageS = 0;
    while (true) {
        const { data, error } = await supabase
            .from('solicitud')
            .select('idsolicitud, totalapagar, totalabonado, porcentajepagado, estado, nrosolicitud')
            .range(pageS * 1000, (pageS + 1) * 1000 - 1);

        if (error) {
            console.error("Error fetching solicitudes:", error.message);
            break;
        }
        if (!data || data.length === 0) break;
        allSolicitudes = allSolicitudes.concat(data);
        if (data.length < 1000) break;
        pageS++;
    }

    console.log(`📋 Procesando ${allSolicitudes.length} solicitudes...\n`);

    const toUpdate: any[] = [];
    let unchanged = 0;
    let statusChangedTo2 = 0;

    for (const sol of allSolicitudes) {
        const totalAbonadoReal = pagosPorSolicitud.get(sol.idsolicitud) || 0;
        const totalapagar = sol.totalapagar || 0;

        let porcentajeRaw = totalapagar > 0 ? Math.round((totalAbonadoReal * 100 / totalapagar) * 100) / 100 : 0;
        // Evitar desbordamiento del campo numeric(5,2) en base de datos si el pago supera con creces la deuda
        const porcentaje = Math.min(porcentajeRaw, 999.99);

        let nuevoEstado = sol.estado;

        // Si está pagada al 100% o más y estaba en estado 1 (pendiente)
        if (sol.estado === 1 && totalapagar > 0 && totalAbonadoReal >= (totalapagar - 0.01)) {
            nuevoEstado = 2;
        }

        const diffAbonado = Math.abs(totalAbonadoReal - (sol.totalabonado || 0));
        const diffPorcentaje = Math.abs(porcentaje - (sol.porcentajepagado || 0));

        if (diffAbonado > 0.01 || diffPorcentaje > 0.01 || nuevoEstado !== sol.estado) {
            toUpdate.push({
                idsolicitud: sol.idsolicitud,
                totalabonado: totalAbonadoReal,
                porcentajepagado: porcentaje,
                estado: nuevoEstado
            });

            if (nuevoEstado === 2 && sol.estado === 1) {
                statusChangedTo2++;
            }
        } else {
            unchanged++;
        }
    }

    // 3. Actualizar en lotes usando upsert (ya que toUpdate tiene idsolicitud que es PK)
    console.log(`🚀 Actualizando ${toUpdate.length} solicitudes mediante bulk upsert...`);
    let errors = 0;
    let updated = 0;

    // UPSERT no funciona con subsets de columnas si queremos ignorar otras, 
    // pero como no estamos insertando nuevas tal vez sea mejor un loop de update secuencial
    // para no sobreescribir columnas omitidas a NULL.
    // Usaremos promises en batch para hacerlo rápido:

    const batchSize = 100;
    for (let i = 0; i < toUpdate.length; i += batchSize) {
        const chunk = toUpdate.slice(i, i + batchSize);
        const promises = chunk.map(updateObj =>
            supabase.from('solicitud')
                .update({
                    totalabonado: updateObj.totalabonado,
                    porcentajepagado: updateObj.porcentajepagado,
                    estado: updateObj.estado
                })
                .eq('idsolicitud', updateObj.idsolicitud)
        );

        const results = await Promise.all(promises);
        for (const res of results) {
            if (res.error) errors++;
            else updated++;
        }
        if (i % 500 === 0) console.log(`   Procesado update de ${i + chunk.length} solicitudes...`);
    }

    console.log("\n─────────────────────────────────────────");
    console.log(`✅ Solicitudes actualizadas (montos/porcentajes): ${updated}`);
    console.log(`🌟 De las cuales pasaron de Pendiente a Pagada:   ${statusChangedTo2}`);
    console.log(`❌ Errores:                                       ${errors}`);
    console.log(`ℹ️  Sin cambios:                                  ${unchanged}`);
}

fixTotalesSolicitudes().catch(err => console.error("Error fatal:", err.message));
