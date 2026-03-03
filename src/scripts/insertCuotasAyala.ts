import { supabase } from '../db';

async function insertCuotas() {
    console.log("Generando cuotas para la solicitud 2555...");

    const { data: sol } = await supabase
        .from('solicitud')
        .select('*')
        .eq('nrosolicitud', 2555)
        .single();

    if (!sol) {
        console.error("No se encontró la solicitud 2555");
        return;
    }

    const { idsolicitud, cantidadcuotas, monto } = sol;
    const importeCuota = monto / cantidadcuotas;

    let currentVencimiento = new Date('2021-12-20T00:00:00Z');

    const cuotasToInsert = [];
    for (let i = 1; i <= cantidadcuotas; i++) {

        let estado = 0; // Pendiente

        // Sabemos que pago $950.000 / 18 cuotas de 150000 -> 950000 / 150000 = 6.33
        // Vamos a asumir que pagó 6 cuotas completas y hay un saldo en la 7
        const cuotasPagadas = Math.floor(950000 / 150000);
        if (i <= cuotasPagadas) {
            estado = 2; // Pagada
        }

        cuotasToInsert.push({
            relasolicitud: idsolicitud,
            nrocuota: i,
            importe: importeCuota,
            vencimiento: currentVencimiento.toISOString(),
            saldoanterior: importeCuota,
            estado: estado,
            fecha: estado === 2 ? currentVencimiento.toISOString() : null, // Asumimos que pago el día del vto
        });

        // Add 1 month
        currentVencimiento.setMonth(currentVencimiento.getMonth() + 1);
    }

    const { count } = await supabase.from('cuotas').select('*', { count: 'exact', head: true }).eq('relasolicitud', idsolicitud);
    if (count && count > 0) {
        console.log(`Ya hay ${count} cuotas cargadas para la solicitud ${idsolicitud}. No se insertarán de nuevo.`);
        return;
    }

    const { data, error } = await supabase
        .from('cuotas')
        .insert(cuotasToInsert)
        .select();

    if (error) {
        console.error("Error insertando cuotas:", error);
    } else {
        console.log(`Se insertaron ${data.length} cuotas para la solicitud 2555. (ID: ${idsolicitud})`);
    }
}

insertCuotas().catch(console.error);
