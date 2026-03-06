import { supabase } from "../src/db";

async function testQuery() {
    try {
        console.log("Fetching some cuotas to see their localidad...");

        const query = supabase
            .from("cuotas")
            .select(
                `
        idcuota,
        estado,
        vencimiento,
        solicitud:relasolicitud!inner(
          nrosolicitud,
          estado,
          cliente:relacliente!inner(relalocalidad)
        )
      `
            )
            .limit(10);

        const { data, error } = await query;
        console.log("Error:", error);
        console.log("Data count:", data?.length);
        if (data && data.length > 0) {
            console.log("Sample Data:", JSON.stringify(data.slice(0, 2), null, 2));
        }

        console.log("\nChecking how the limit affects the filtering...");
        // If we limit to 10 and THEN filter by locality 2, do we get 0? 
        // PostgREST might apply limit AFTER filtering.
        const query2 = supabase
            .from("cuotas")
            .select(
                `
        idcuota,
        solicitud:relasolicitud!inner(
          nrosolicitud,
          cliente:relacliente!inner(relalocalidad)
        )
      `
            )
            .eq("solicitud.cliente.relalocalidad", 2)
            .limit(10);

        const res2 = await query2;
        console.log("query2 count (localidad=2):", res2.data?.length);

    } catch (e) {
        console.error(e);
    }
}

testQuery();
