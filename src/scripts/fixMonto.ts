
import { supabase } from '../db';

async function fixMonto() {
    console.log("⚙️  Cargando solicitudes...");

    // Load all at once
    let all: any[] = [];
    let p = 0;
    while (true) {
        const { data } = await supabase
            .from('solicitud')
            .select('idsolicitud, totalapagar, cantidadcuotas')
            .gt('cantidadcuotas', 0)
            .gt('totalapagar', 0)
            .range(p * 1000, (p + 1) * 1000 - 1);
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < 1000) break;
        p++;
    }
    console.log(`📋 ${all.length} solicitudes a actualizar\n`);

    // Run in parallel batches of 50
    const CHUNK = 50;
    let done = 0;
    for (let i = 0; i < all.length; i += CHUNK) {
        const chunk = all.slice(i, i + CHUNK);
        await Promise.all(chunk.map(s =>
            supabase.from('solicitud')
                .update({ monto: Math.round(s.totalapagar / s.cantidadcuotas) })
                .eq('idsolicitud', s.idsolicitud)
        ));
        done += chunk.length;
        process.stdout.write(`\r  ✅ ${done}/${all.length}`);
    }
    console.log('\n\n✅ Monto corregido en todas las solicitudes.');
}

fixMonto().catch(e => console.error("Error:", e.message));
