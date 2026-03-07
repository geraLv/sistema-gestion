import { supabase } from "./src/db";

async function fixCuotas1227() {
    console.log("--- CORRIGIENDO CUOTAS DE SOLICITUD 2818 (CSV: 1227) ---");

    // 1. Corregir importes de las cuotas 18, 19 y 20
    const correccionesImporte = [
        { nrocuota: 18, importe: 200000 },
        { nrocuota: 19, importe: 200000 },
        { nrocuota: 20, importe: 210000 }
    ];

    for (const corr of correccionesImporte) {
        const { error } = await supabase
            .from('cuotas')
            .update({ importe: corr.importe })
            .eq('relasolicitud', 2818)
            .eq('nrocuota', corr.nrocuota);

        if (error) console.error(`Error actualizando importe de cuota ${corr.nrocuota}:`, error);
        else console.log(`Cuota ${corr.nrocuota} actualizada a $${corr.importe}`);
    }

    // 2. Corregir estados: Cuotas 21 en adelante están impagas en el CSV (estado: 0), 
    // pero en BD están pagadas hasta la 25 (estado: 2). Las regresamos a impagas.
    const { error: errorEstado } = await supabase
        .from('cuotas')
        .update({ estado: 0, fecha: null, saldoanterior: null, formapago: null })
        .eq('relasolicitud', 2818)
        .gte('nrocuota', 21)
        .lte('nrocuota', 30);

    if (errorEstado) console.error(`Error actualizando estado de cuotas 21-30:`, errorEstado);
    else console.log(`Cuotas 21 a 30 marcadas como impagas (0) según CSV.`);

    // 3. Recalcular totalabonado y porcentaje pagado en la solicitud
    const { data: cuotasPagadas } = await supabase
        .from('cuotas')
        .select('importe')
        .eq('relasolicitud', 2818)
        .eq('estado', 2);

    const totalAbonado = (cuotasPagadas || []).reduce((sum, c) => sum + c.importe, 0);

    const { data: sol } = await supabase
        .from('solicitud')
        .select('totalapagar')
        .eq('idsolicitud', 2818)
        .single();

    const porcentaje = sol ? (totalAbonado * 100) / sol.totalapagar : 0;
    const porcentajeRedondeado = Math.round(porcentaje * 100) / 100;

    const { error: errorSol } = await supabase
        .from('solicitud')
        .update({ totalabonado: totalAbonado, porcentajepagado: porcentajeRedondeado })
        .eq('idsolicitud', 2818);

    if (errorSol) console.error(`Error actualizando solicitud 2818:`, errorSol);
    else console.log(`Solicitud 2818 actualizada: totalabonado = $${totalAbonado}, porcentajepagado = ${porcentajeRedondeado}%`);

    console.log("CORRECCIÓN COMPLETADA.");
}
fixCuotas1227();
