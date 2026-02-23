import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    const { count: clientCount, error: clientError } = await supabase.from('cliente').select('*', { count: 'exact', head: true });
    console.log(`Clientes: ${clientCount}, Error: ${clientError?.message}`);

    const { count: productoCount, error: productoError } = await supabase.from('producto').select('*', { count: 'exact', head: true });
    console.log(`Productos: ${productoCount}, Error: ${productoError?.message}`);

    const { count: solicitudCount, error: solicitudError } = await supabase.from('solicitud').select('*', { count: 'exact', head: true });
    console.log(`Solicitudes: ${solicitudCount}, Error: ${solicitudError?.message}`);

    const { count: cuotasCount, error: cuotasError } = await supabase.from('cuotas').select('*', { count: 'exact', head: true });
    console.log(`Cuotas: ${cuotasCount}, Error: ${cuotasError?.message}`);
}

check();
