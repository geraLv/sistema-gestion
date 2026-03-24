const path = require("path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are required.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GEOREF_BASE_URL =
  process.env.GEOREF_BASE_URL || "https://apis.datos.gob.ar/georef/api";
const PAGE_SIZE = Number(process.env.GEOREF_PAGE_SIZE || 1000);
const INSERT_BATCH_SIZE = Number(process.env.LOCALIDADES_INSERT_BATCH || 500);
const isDryRun = process.argv.includes("--dry-run");

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function makeKey(provincia, departamento, localidad) {
  return [
    normalizeText(provincia),
    normalizeText(departamento),
    normalizeText(localidad),
  ].join("|");
}

function getCoords(item) {
  const lat = item?.centroide?.lat;
  const lon = item?.centroide?.lon;

  if (typeof lat !== "number" || typeof lon !== "number") {
    return null;
  }

  return `${lat},${lon}`;
}

async function fetchAllLocalidadesFromGeoRef() {
  const all = [];
  let inicio = 0;
  let total = Number.POSITIVE_INFINITY;

  while (inicio < total) {
    const url = `${GEOREF_BASE_URL}/localidades?max=${PAGE_SIZE}&inicio=${inicio}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error fetching ${url}: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const page = Array.isArray(payload.localidades) ? payload.localidades : [];
    const cantidad = Number(payload.cantidad || page.length || 0);
    total = Number(payload.total || 0);

    all.push(...page);
    inicio += cantidad;

    console.log(
      `[GeoRef] fetched ${all.length}/${total} localidades (page size ${cantidad})`,
    );

    if (cantidad === 0) break;
  }

  return all;
}

async function fetchExistingLocalidades() {
  const all = [];
  let from = 0;
  const step = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("localidad")
      .select("idlocalidad, provincia, departamento, localidad")
      .range(from, from + step - 1);

    if (error) {
      throw new Error(`Error fetching existing localidades: ${error.message}`);
    }

    if (!data || data.length === 0) break;
    all.push(...data);

    if (data.length < step) break;
    from += step;
  }

  return all;
}

async function fetchCurrentMaxIdLocalidad() {
  const { data, error } = await supabase
    .from("localidad")
    .select("idlocalidad")
    .order("idlocalidad", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    throw new Error(`Error fetching max idlocalidad: ${error.message}`);
  }

  return Number(data?.idlocalidad || 0);
}

async function insertInBatches(rows) {
  for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + INSERT_BATCH_SIZE);
    const { error } = await supabase.from("localidad").insert(batch);

    if (error) {
      throw new Error(
        `Error inserting batch ${i / INSERT_BATCH_SIZE + 1}: ${error.message}`,
      );
    }

    console.log(
      `[DB] inserted batch ${i / INSERT_BATCH_SIZE + 1} (${batch.length} rows)`,
    );
  }
}

async function run() {
  console.log(`Starting catalog import (dry-run: ${isDryRun})`);

  const [existing, remote, maxIdLocalidad] = await Promise.all([
    fetchExistingLocalidades(),
    fetchAllLocalidadesFromGeoRef(),
    fetchCurrentMaxIdLocalidad(),
  ]);

  const existingKeys = new Set(
    existing.map((row) => makeKey(row.provincia, row.departamento, row.localidad)),
  );

  const incomingSeen = new Set();
  const toInsert = [];
  let skippedExisting = 0;
  let skippedRemoteDuplicates = 0;
  let skippedInvalid = 0;

  for (const item of remote) {
    const provincia = item?.provincia?.nombre?.trim();
    const departamento =
      item?.departamento?.nombre?.trim() ||
      item?.municipio?.nombre?.trim() ||
      "Sin departamento";
    const localidad = item?.nombre?.trim();

    if (!provincia || !departamento || !localidad) {
      skippedInvalid++;
      continue;
    }

    const key = makeKey(provincia, departamento, localidad);
    if (incomingSeen.has(key)) {
      skippedRemoteDuplicates++;
      continue;
    }
    incomingSeen.add(key);

    if (existingKeys.has(key)) {
      skippedExisting++;
      continue;
    }

    toInsert.push({
      provincia,
      departamento,
      localidad,
      nombre: `${provincia}-${departamento}-${localidad}`,
      coordenadas: getCoords(item),
    });
  }

  const uniqueRemoteProvinces = new Set(
    remote
      .map((item) => item?.provincia?.nombre)
      .filter((value) => typeof value === "string" && value.trim() !== ""),
  ).size;

  console.log(`[Summary] existing localidades: ${existing.length}`);
  console.log(`[Summary] remote localidades: ${remote.length}`);
  console.log(`[Summary] remote provincias: ${uniqueRemoteProvinces}`);
  console.log(`[Summary] skipped existing: ${skippedExisting}`);
  console.log(`[Summary] skipped remote duplicates: ${skippedRemoteDuplicates}`);
  console.log(`[Summary] skipped invalid: ${skippedInvalid}`);
  console.log(`[Summary] rows to insert: ${toInsert.length}`);
  console.log(`[Summary] current max idlocalidad: ${maxIdLocalidad}`);

  if (isDryRun) {
    console.log("Dry-run complete. No rows inserted.");
    if (toInsert.length > 0) {
      console.log("Sample row:", toInsert[0]);
    }
    return;
  }

  if (toInsert.length === 0) {
    console.log("No new localidades to insert.");
    return;
  }

  let nextId = maxIdLocalidad + 1;
  const rowsWithIds = toInsert.map((row) => {
    const value = {
      idlocalidad: nextId,
      ...row,
    };
    nextId += 1;
    return value;
  });

  await insertInBatches(rowsWithIds);

  const totalAfter = existing.length + toInsert.length;
  console.log(`[Done] inserted: ${toInsert.length}`);
  console.log(`[Done] estimated total localidades in DB: ${totalAfter}`);
}

run().catch((error) => {
  console.error("Import failed:", error.message);
  process.exit(1);
});
