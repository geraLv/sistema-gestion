import { supabase } from "./src/db";

async function query() {
    const { data: cuotas } = await supabase
        .from('cuotas')
        .select('nrocuota, vencimiento, estado')
        .eq('relasolicitud', 2818)
        .order('nrocuota', { ascending: true });

    console.log(cuotas.filter(c => c.estado === 2).slice(-2));
    console.log(cuotas.filter(c => c.estado === 0).slice(0, 2));
}
query();
