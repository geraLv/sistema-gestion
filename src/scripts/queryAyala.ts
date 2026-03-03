import { supabase } from '../db';
async function queryId() {
    const { data } = await supabase.from('cliente').select('*').eq('idcliente', 1690);
    console.log(data);
}
queryId();
