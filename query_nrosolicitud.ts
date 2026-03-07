import { supabase } from "./src/db";

async function query() {
    console.log("--- BÚSQUEDA POR NROSOLICITUD 1893 ---");
    const { data: sols } = await supabase
        .from('solicitud')
        .select('idsolicitud, nrosolicitud, monto, cantidadcuotas, estado, fechalta, totalabonado, totalapagar')
        .eq('nrosolicitud', '1893');

    console.log(sols);

    if (sols && sols.length > 0) {
        console.log(`\n--- CUOTAS DE LA SOLICITUD CON ID ${sols[0].idsolicitud} ---`);
        const { data: cuotas } = await supabase
            .from('cuotas')
            .select('*')
            .eq('relasolicitud', sols[0].idsolicitud)
            .order('nrocuota', { ascending: true });

        console.log(cuotas);
    }
}
query();
