import { supabase } from "./src/db";

async function diagnose() {
  console.log("--- Diagnóstico de Notificaciones ---");

  // 1. Verificar Tipos de Notificación
  const { data: tipos, error: errTipos } = await supabase
    .from("notificacion_tipo")
    .select("*")
    .eq("activo", true);
  
  if (errTipos) console.error("Error tipos:", errTipos);
  console.log("Tipos activos:", tipos?.map(t => t.codigo));

  // 2. Verificar Templates
  const { data: templates, error: errTemplates } = await supabase
    .from("notificacion_plantilla")
    .select("*, notificacion_tipo(codigo)")
    .eq("activo", true);

  if (errTemplates) console.error("Error templates:", errTemplates);
  console.log("Templates activos para tipos:", templates?.map((t: any) => t.notificacion_tipo?.codigo));

  // 3. Ver hoy (2026-03-19) en notificacion_envio
  const { data: envios, error: errEnvios } = await supabase
    .from("notificacion_envio")
    .select("*")
    .eq("fecha_programada", "2026-03-19");

  if (errEnvios) console.error("Error envios:", errEnvios);
  console.log(`Envios para hoy (2026-03-19): ${envios?.length || 0}`);
  
  if (envios && envios.length > 0) {
    const stats = envios.reduce((acc: any, curr) => {
      acc[curr.estado] = (acc[curr.estado] || 0) + 1;
      return acc;
    }, {});
    console.log("Estados de los envios de hoy:", stats);

    const deadRecords = envios.filter(e => e.estado === 'dead' || e.estado === 'failed');
    if (deadRecords.length > 0) {
        console.log("Muestra de errores en dead/failed:");
        console.log(deadRecords.slice(0, 3).map(e => ({
            id: e.idenvio,
            error: e.ultimo_error,
            intentos: e.intentos,
            idempotency_key: e.idempotency_key
        })));
    }
  }

  // 4. Verificar si hay clientes con cumpleaños hoy
  const runDate = "2026-03-19";
  const runMonth = 3;
  const runDay = 19;
  
  const { data: clientes, error: errClientes } = await supabase
    .from("cliente")
    .select("idcliente, appynom, email, fecha_nacimiento")
    .not("fecha_nacimiento", "is", null);

  if (errClientes) console.error("Error clientes:", errClientes);
  
  const cumpleañeros = clientes?.filter(c => {
    const d = new Date(c.fecha_nacimiento);
    return (d.getUTCMonth() + 1) === runMonth && d.getUTCDate() === runDay;
  });

  console.log(`Clientes con cumple hoy en DB: ${cumpleañeros?.length || 0}`);
  if (cumpleañeros && cumpleañeros.length > 0) {
      console.log("Muestra cumpleañeros:", cumpleañeros.slice(0, 3));
  }
}

diagnose();
