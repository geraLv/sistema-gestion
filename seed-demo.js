/* eslint-disable no-console */
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

dotenv.config();

const url = process.env.SUPABASE_URL || "";
const key = process.env.SUPABASE_KEY || "";

if (!url || !key) {
  console.error("SUPABASE_URL or SUPABASE_KEY not set.");
  process.exit(1);
}

const supabase = createClient(url, key);

const BATCH_SIZE = 100;

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const toISODate = (d) => d.toISOString().split("T")[0];

async function getMaxId(table, idField) {
  const { data, error } = await supabase
    .from(table)
    .select(idField)
    .order(idField, { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(
      `Error fetching max ${idField} from ${table}: ${error.message}`,
    );
  }

  if (!data || data.length === 0 || !Number.isInteger(data[0][idField])) {
    return 0;
  }

  return data[0][idField];
}

async function getNextNroSolicitud() {
  const { data, error } = await supabase
    .from("solicitud")
    .select("nrosolicitud, idsolicitud")
    .order("idsolicitud", { ascending: false })
    .limit(25);

  if (error) {
    throw new Error(`Error fetching last solicitud: ${error.message}`);
  }

  const numeric = (data || [])
    .map((row) => {
      const fromNro = parseInt(String(row.nrosolicitud || "").trim(), 10);
      if (Number.isFinite(fromNro)) return fromNro;
      if (Number.isFinite(row.idsolicitud)) return Number(row.idsolicitud);
      return NaN;
    })
    .filter((n) => Number.isFinite(n));

  const max = numeric.length > 0 ? Math.max(...numeric) : 0;
  return max + 1;
}

async function fetchLookups() {
  const [localidadesRes, productosRes, vendedoresRes] = await Promise.all([
    supabase.from("localidad").select("idlocalidad, nombre"),
    supabase.from("producto").select("idproducto, descripcion"),
    supabase.from("vendedor").select("idvendedor, apellidonombre"),
  ]);

  if (localidadesRes.error) {
    throw new Error(
      `Error fetching localidades: ${localidadesRes.error.message}`,
    );
  }
  if (productosRes.error) {
    throw new Error(`Error fetching productos: ${productosRes.error.message}`);
  }
  if (vendedoresRes.error) {
    throw new Error(
      `Error fetching vendedores: ${vendedoresRes.error.message}`,
    );
  }

  if (!localidadesRes.data?.length) {
    throw new Error("No hay localidades. Cree al menos una localidad.");
  }
  if (!productosRes.data?.length) {
    throw new Error("No hay productos. Cree al menos un producto.");
  }
  if (!vendedoresRes.data?.length) {
    throw new Error("No hay vendedores. Cree al menos un vendedor.");
  }

  return {
    localidades: localidadesRes.data,
    productos: productosRes.data,
    vendedores: vendedoresRes.data,
  };
}

async function insertInBatches(table, rows) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      throw new Error(`Error inserting into ${table}: ${error.message}`);
    }
  }
}

async function seedDemo() {
  console.log("Starting demo seed...");

  const { localidades, productos, vendedores } = await fetchLookups();

  const maxCliente = await getMaxId("cliente", "idcliente");
  const maxSolicitud = await getMaxId("solicitud", "idsolicitud");
  const maxCuota = await getMaxId("cuotas", "idcuota");
  let nextNro = await getNextNroSolicitud();
  if (nextNro > 9000) {
    nextNro = 1000;
  }

  const clientes = [];
  for (let i = 1; i <= 200; i += 1) {
    const id = maxCliente + i;
    const dni = String(20000000 + id).padStart(8, "0");
    clientes.push({
      idcliente: id,
      appynom: `Cliente Demo ${String(i).padStart(3, "0")}`,
      dni,
      direccion: `Calle ${randInt(1, 2000)} #${randInt(1, 999)}`,
      telefono: `370-${randInt(100000, 999999)}`,
      relalocalidad:
        localidades[randInt(0, localidades.length - 1)].idlocalidad,
      condicion: 1,
      fechalta: new Date().toISOString(),
    });
  }

  const solicitudes = [];
  const cuotas = [];
  const today = new Date();

  for (let i = 1; i <= 200; i += 1) {
    const solicitudId = maxSolicitud + i;
    const nroSolicitud = String(nextNro + i - 1);
    const cliente = clientes[randInt(0, clientes.length - 1)];
    const producto = productos[randInt(0, productos.length - 1)];
    const productoId = producto.idproducto ?? null;
    if (!productoId) {
      throw new Error("Producto inválido: falta relaproducto/idproducto.");
    }
    const vendedor = vendedores[randInt(0, vendedores.length - 1)];
    const monto = randInt(500, 9000);
    const estadoCuota = 0;
    const totalabonado = 0;
    const porcentajepagado = 0;

    const createdDate = new Date(today);
    createdDate.setDate(createdDate.getDate() - randInt(0, 120));

    solicitudes.push({
      idsolicitud: solicitudId,
      relacliente: cliente.idcliente,
      relaproducto: productoId,
      relavendedor: vendedor.idvendedor,
      monto,
      cantidadcuotas: 1,
      totalabonado,
      nrosolicitud: nroSolicitud,
      totalapagar: monto,
      porcentajepagado,
      observacion: "Demo",
      estado: 1,
      fechalta: createdDate.toISOString(),
    });

    const vencimiento = new Date(createdDate);
    vencimiento.setMonth(vencimiento.getMonth() + 1);

    cuotas.push({
      idcuota: maxCuota + i,
      relasolicitud: solicitudId,
      nrocuota: 1,
      importe: monto,
      vencimiento: toISODate(vencimiento),
      estado: estadoCuota,
      saldoanterior: 0,
      fecha: estadoCuota === 2 ? toISODate(today) : null,
    });
  }

  console.log("Inserting clientes...");
  await insertInBatches("cliente", clientes);
  console.log("Inserting solicitudes...");
  await insertInBatches("solicitud", solicitudes);
  console.log("Inserting cuotas...");
  await insertInBatches("cuotas", cuotas);

  console.log("Demo seed completed successfully.");
}

seedDemo().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
