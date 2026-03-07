import { supabase } from "./src/db";

async function query() {
    console.log("--- SOLICITUD 2818 EN BD ---");
    const { data: sol } = await supabase
        .from('solicitud')
        .select('idsolicitud, monto, cantidadcuotas, estado, fechalta, totalabonado, totalapagar')
        .eq('idsolicitud', 2818)
        .single();
    console.log(sol);

    console.log("\n--- CUOTAS EN BD PARA SOLICITUD 2818 ---");
    const { data: cuotas } = await supabase
        .from('cuotas')
        .select('nrocuota, importe, fecha, vencimiento, estado')
        .eq('relasolicitud', 2818)
        .order('nrocuota', { ascending: true });

    if (cuotas) {
        console.log(cuotas.map(c => `Cuota ${c.nrocuota}: Importe $${c.importe} | Vencimiento: ${c.vencimiento} | Pago: ${c.fecha} | Estado: ${c.estado}`).join('\n'));
    }
}
query();
