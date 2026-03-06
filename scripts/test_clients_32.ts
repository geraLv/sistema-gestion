import { supabase } from "../src/db";

async function verifyClientsLocality() {
    try {
        const localidadId = 32;

        // 1. Total clients with relalocalidad = 32
        const { count: totalClients } = await supabase
            .from("cliente")
            .select("*", { count: "exact" })
            .eq("relalocalidad", localidadId);

        // 2. Clients that appear in the receipt query for the current month
        // Let's use current month
        const mes = "2024-03"; // or whatever current month is. Let's just find exactly what gets printed.
        const now = new Date();
        const currentMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const [anio, mesNum] = currentMes.split("-").map(Number);
        const ultimoDiaMes = new Date(anio, mesNum, 0).getDate();
        const primerDia = `${currentMes}-01`;
        const ultimoDia = `${currentMes}-${String(ultimoDiaMes).padStart(2, "0")}`;

        const { data: recibos } = await supabase
            .from("cuotas")
            .select(
                `
        idcuota,
        estado,
        vencimiento,
        solicitud:relasolicitud!inner(
          nrosolicitud, 
          estado,
          cliente:relacliente!inner(idcliente, appynom, relalocalidad)
        )
      `
            )
            .eq("estado", 0)
            .eq("solicitud.estado", 1)
            .gte("vencimiento", primerDia)
            .lte("vencimiento", ultimoDia)
            .eq("solicitud.cliente.relalocalidad", localidadId);

        console.log(`Total clientes en DB para localidad ${localidadId}:`, totalClients);
        console.log(`Impagas en este mes (${currentMes}):`, recibos?.length);
    } catch (err) {
        console.error(err);
    }
}

verifyClientsLocality();
