import { supabase } from "./src/db";

async function fixSolicitudesPagadas() {
    console.log("Iniciando revisión de solicitudes...");

    const { data: solicitudes, error } = await supabase
        .from("solicitud")
        .select("idsolicitud, totalabonado, totalapagar, estado, porcentajepagado")
        .eq("estado", 1); // Only active ones

    if (error) {
        console.error("Error obteniendo solicitudes:", error.message);
        process.exit(1);
    }

    let fixedCount = 0;

    for (const sol of solicitudes) {
        if (sol.totalapagar > 0 && sol.totalabonado >= sol.totalapagar - 0.01) {
            console.log(`Fijando solicitud ${sol.idsolicitud} como Pagada...`);
            const { error: upError } = await supabase
                .from("solicitud")
                .update({ estado: 2 })
                .eq("idsolicitud", sol.idsolicitud);

            if (upError) {
                console.error(`Error actualizando ${sol.idsolicitud}:`, upError.message);
            } else {
                fixedCount++;
            }
        } else if (sol.porcentajepagado >= 99.9) {
            // Just in case totalapagar has weird float precision
            console.log(`Fijando solicitud ${sol.idsolicitud} como Pagada (porcentaje)...`);
            const { error: upError } = await supabase
                .from("solicitud")
                .update({ estado: 2 })
                .eq("idsolicitud", sol.idsolicitud);

            if (upError) {
                console.error(`Error actualizando ${sol.idsolicitud}:`, upError.message);
            } else {
                fixedCount++;
            }
        }
    }

    console.log(`Proceso terminado. Solicitudes arregladas: ${fixedCount}`);
    process.exit(0);
}

fixSolicitudesPagadas();
