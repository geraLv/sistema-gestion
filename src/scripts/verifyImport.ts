
import { supabase } from '../db';

async function verify() {
    const { count, error } = await supabase
        .from('solicitud')
        .select('*', { count: 'exact', head: true })
        .eq('observacion', 'Imported from PDF');

    if (error) {
        console.error("Error verifying:", error);
    } else {
        console.log(`Newly inserted solicitudes (Imported from PDF): ${count}`);
    }

    // Also check total count
    const { count: total, error: err2 } = await supabase
        .from('solicitud')
        .select('*', { count: 'exact', head: true });

    console.log(`Total solicitudes in DB: ${total}`);

    // Check specific client to be 100% sure
    const { data: clientCheck, error: err3 } = await supabase
        .from('cliente')
        .select('dni')
        .ilike('dni', '%35787328%'); // Check if this DNI exists in ANY format

    console.log(`Check for DNI 35787328: ${JSON.stringify(clientCheck)}`);
}

verify();
