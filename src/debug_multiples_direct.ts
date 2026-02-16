
import { supabase } from "./db";

async function checkMultiplesDirect() {
    const idcuotas = [201];
    console.log(`Checking multiples exact query for ${idcuotas}...`);

    try {
        const { data, error } = await supabase
            .from("cuotas")
            .select(
                `
        idcuota, nrocuota, importe, vencimiento, estado,
        solicitud:relasolicitud(
          nrosolicitud, estado,
          cliente:relacliente(appynom, dni, direccion, telefono, localidad:relalocalidad(nombre)),
          producto:relaproducto(descripcion)
        )
      `,
            )
            .in("idcuota", idcuotas)
            .order("nrocuota", { ascending: true });

        if (error) {
            console.error("Error fetching:", error);
        } else {
            console.log("Results count:", data?.length);
            if (data && data.length > 0) {
                console.log("First result:", JSON.stringify(data[0], null, 2));
                // Simulate internal map logic
                const row = data[0];
                if ((row as any).estado !== 2) {
                    console.warn("Estado != 2");
                } else {
                    console.log("Estado OK");
                }
            }
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

checkMultiplesDirect();
