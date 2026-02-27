import { supabase } from '../db';

/**
 * Script para corregir solicitudes que están 100% pagadas pero siguen con estado=1 (Pendiente).
 * Las actualiza a estado=2 (Pagada).
 */
async function fixEstadosSolicitudes() {
    console.log("🔧 Buscando solicitudes completamente pagadas con estado incorrecto...\n");

    // Fetch all solicitudes con estado=1 (activa/pendiente)
    let allPendientes: any[] = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase
            .from('solicitud')
            .select('idsolicitud, totalapagar, totalabonado, porcentajepagado, estado, nrosolicitud')
            .eq('estado', 1)
            .range(page * 1000, (page + 1) * 1000 - 1);

        if (error) {
            console.error("Error fetching solicitudes:", error.message);
            break;
        }
        if (!data || data.length === 0) break;
        allPendientes = allPendientes.concat(data);
        if (data.length < 1000) break;
        page++;
    }

    console.log(`📋 ${allPendientes.length} solicitudes con estado=1 (Pendiente)\n`);

    let fixed = 0;
    let recalculated = 0;
    let errors = 0;

    for (const sol of allPendientes) {
        // Recalcular totalabonado desde las cuotas pagadas
        const { data: cuotasPagadas, error: errorCuotas } = await supabase
            .from('cuotas')
            .select('importe')
            .eq('relasolicitud', sol.idsolicitud)
            .eq('estado', 2);

        if (errorCuotas) {
            console.error(`  ❌ Error leyendo cuotas de solicitud ${sol.nrosolicitud}: ${errorCuotas.message}`);
            errors++;
            continue;
        }

        const totalAbonadoReal = (cuotasPagadas || []).reduce((sum: number, c: any) => sum + (c.importe || 0), 0);
        const totalapagar = sol.totalapagar || 0;

        // Verificar si está completamente pagada (con tolerancia de $0.01)
        if (totalapagar > 0 && totalAbonadoReal >= totalapagar - 0.01) {
            const porcentaje = Math.round((totalAbonadoReal * 100 / totalapagar) * 100) / 100;

            const { error: updateError } = await supabase
                .from('solicitud')
                .update({
                    estado: 2,
                    totalabonado: totalAbonadoReal,
                    porcentajepagado: porcentaje,
                })
                .eq('idsolicitud', sol.idsolicitud);

            if (updateError) {
                console.error(`  ❌ Error actualizando solicitud ${sol.nrosolicitud}: ${updateError.message}`);
                errors++;
            } else {
                console.log(`  ✅ Solicitud ${sol.nrosolicitud} → Pagada (abonado: $${totalAbonadoReal.toLocaleString()}, total: $${totalapagar.toLocaleString()}, ${porcentaje}%)`);
                fixed++;
            }
        } else if (Math.abs(totalAbonadoReal - (sol.totalabonado || 0)) > 0.01) {
            // Recalcular porcentaje si el totalabonado estaba desactualizado
            const porcentaje = totalapagar > 0 ? Math.round((totalAbonadoReal * 100 / totalapagar) * 100) / 100 : 0;

            const { error: updateError } = await supabase
                .from('solicitud')
                .update({
                    totalabonado: totalAbonadoReal,
                    porcentajepagado: porcentaje,
                })
                .eq('idsolicitud', sol.idsolicitud);

            if (!updateError) {
                recalculated++;
            }
        }
    }

    console.log("\n─────────────────────────────────────────");
    console.log(`✅ Solicitudes corregidas a Pagada:   ${fixed}`);
    console.log(`🔄 Porcentajes recalculados:          ${recalculated}`);
    console.log(`❌ Errores:                           ${errors}`);
    console.log(`ℹ️  Sin cambios:                      ${allPendientes.length - fixed - recalculated - errors}`);
}

fixEstadosSolicitudes().catch(err => console.error("Error fatal:", err.message));
