import { supabase } from "./src/db";

async function testQuery() {
  const hoy = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("cuotas")
    .select(
      `
      idcuota,
      nrocuota,
      importe,
      fecha,
      solicitud:relasolicitud(
        nrosolicitud,
        cliente(appynom),
        vendedor:app_user!relausuario(nombre, apellidonombre)
      )
    `
    )
    .eq("estado", 2)
    .eq("fecha", hoy)
    .limit(1);

  if (error) {
    console.error("SUPABASE ERROR:", error);
  } else {
    console.log("SUCCESS:", JSON.stringify(data, null, 2));
  }
}

testQuery();
