import { supabase } from "../src/db";
import { ReporteRepository } from "../src/repositories/reporteRepository";

async function testQuery() {
    try {
        console.log("Testing getRecibosMesData with localidad...");
        // Assuming there's a valid month and locality. Let's trace the query result.
        // I will use a month that probably has data. Let's use 2024-03 or similar.
        // Actually, we can just execute the raw query to see if the filter works.
        const mes = "2024-03";
        const primerDia = `${mes}-01`;
        const ultimoDia = `${mes}-31`;

        const query = supabase
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
            .gte("vencimiento", primerDia)
            .lte("vencimiento", ultimoDia)
            .eq("solicitud.cliente.relalocalidad", 1)
            .limit(10);

        const { data, error } = await query;
        console.log("Error:", error);
        console.log("Data count:", data?.length);
        if (data && data.length > 0) {
            console.log("Sample Data:", JSON.stringify(data[0], null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}

testQuery();
