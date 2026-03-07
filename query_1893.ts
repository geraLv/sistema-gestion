import { supabase } from "./src/db";

async function query() {
    console.log("--- SOLICITUD ---");
    const { data: solicitud, error: e1 } = await supabase
        .from('solicitud')
        .select('*')
        .eq('idsolicitud', 1893)
        .single();

    if (e1) console.error("Error solicitud:", e1.message);
    else console.log(solicitud);

    console.log("\n--- CUOTAS ---");
    const { data: cuotas, error: e2 } = await supabase
        .from('cuotas')
        .select('*')
        .eq('relasolicitud', 1893)
        .order('nrocuota', { ascending: true });

    if (e2) console.error("Error cuotas:", e2.message);
    else console.log(cuotas);

    process.exit(0);
}

query();
