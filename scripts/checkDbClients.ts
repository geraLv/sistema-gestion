import { supabase } from "../src/db";

async function verifyDb() {
    const { count: totalClientes } = await supabase.from('cliente').select('*', { count: 'exact', head: true });

    const { data: maxIdData } = await supabase.from('cliente').select('idcliente').order('idcliente', { ascending: false }).limit(1);

    console.log(`Clientes totales en Supabase: ${totalClientes}`);
    console.log(`ID Cliente máximo en DB: ${maxIdData?.[0]?.idcliente}`);

    const localidadId = 32;
    const { count: totalLocality32 } = await supabase.from('cliente').select('*', { count: 'exact', head: true }).eq('relalocalidad', localidadId);

    console.log(`Total Locality 32 in DB: ${totalLocality32}`);
}

verifyDb();
