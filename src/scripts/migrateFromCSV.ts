import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Faltan las credenciales de Supabase en el archivo .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Interfaces para los datos del CSV
interface CsvCliente {
    idcliente: number;
    relalocalidad: string;
    appynom: string;
    dni: string;
    direccion: string;
    telefono: string;
    condicion: string;
    fechalta: string | null;
}

interface CsvSolicitud {
    idsolicitud: number;
    relacliente: number; // ID del CSV
    relaproducto: number;
    relavendedor: number;
    monto: number;
    cantidadcuotas: number;
    totalabonado: number;
    fechalta: string | null;
    nrosolicitud: string;
    totalapagar: number;
    porcentajepagado: number;
    observacion: string;
    estado: number;
}

interface CsvCuota {
    idcuota: number;
    relasolicitud: number;
    nrocuota: number;
    importe: number;
    fecha: string | null;
    vencimiento: string;
    saldoanterior: number;
    estado: number;
}

// Función para parsear una línea CSV compleja
function parseCsvLine(line: string): string[] {
    let cleanLine = line.trim();
    // El CSV envuelve toda la fila en comillas y duplica las internas
    if (cleanLine.startsWith('"') && cleanLine.endsWith('"')) {
        cleanLine = cleanLine.substring(1, cleanLine.length - 1);
        cleanLine = cleanLine.replace(/""/g, '"');
    }

    const result: string[] = [];
    let currentVal = "";
    let inQuotes = false;

    for (let i = 0; i < cleanLine.length; i++) {
        const char = cleanLine[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(currentVal.trim().replace(/^"|"$/g, ''));
            currentVal = "";
        } else {
            currentVal += char;
        }
    }
    result.push(currentVal.trim().replace(/^"|"$/g, ''));
    return result;
}

// Limpiar DNI para comparaciones (quitar puntos, espacios)
function cleanDni(dni: string): string {
    if (!dni || dni === "NULL" || dni === "") return "";
    return dni.replace(/[\.\s-]/g, "").trim();
}

function parseDate(dateStr: string): string | null {
    if (!dateStr || dateStr === "NULL" || dateStr === "0000-00-00 00:00:00" || dateStr === "0000-00-00") {
        return null;
    }
    return dateStr;
}

async function migrateData() {
    const isDryRun = process.argv.includes("--dry-run");
    const filePath = path.resolve(__dirname, "../../../DOC PROGRAMADOR.csv");

    console.log(`🚀 Iniciando ${isDryRun ? "DRY-RUN de " : ""}migración desde: ${filePath}`);

    const rawData = fs.readFileSync(filePath, "utf-8");

    // Dividir por saltos de línea, pero con cuidado de las observaciones multilínea
    // Separamos por newline y luego unimos si la línea no parece un registro nuevo
    const rawLines = rawData.split(/\r?\n/);
    const lines: string[] = [];

    let currentLine = "";
    for (const line of rawLines) {
        if (currentLine) {
            currentLine += "\n" + line;
            // Verificar si ya cerramos todas las comillas
            const quoteCount = (currentLine.match(/"/g) || []).length;
            if (quoteCount % 2 === 0) {
                lines.push(currentLine);
                currentLine = "";
            }
        } else {
            const quoteCount = (line.match(/"/g) || []).length;
            if (quoteCount % 2 !== 0 && !line.match(/^\"id[a-z]+,/)) {
                // Línea incompleta, empezamos a acumular
                currentLine = line;
            } else if (line.trim()) {
                lines.push(line);
            }
        }
    }

    console.log(`📊 Total de filas válidas pre-procesadas: ${lines.length}`);

    const clientesCsv: CsvCliente[] = [];
    const solicitudesCsv: CsvSolicitud[] = [];
    const cuotasCsv: CsvCuota[] = [];

    let currentTable = "";
    let parsedRowCount = 0;

    console.log("🔍 Parseando archivo CSV...");
    if (lines.length > 5) {
        console.log("Ejemplo líneas (0 a 5):", lines.slice(0, 5));
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detectar encabezados de tabla
        if (line.includes("idcliente,") || line.includes('"idcliente,')) {
            currentTable = "cliente";
            console.log(`Encontrado header cliente en línea ${i}: ${line.substring(0, 50)}`);
            continue;
        } else if (line.includes("idcuota,") || line.includes('"idcuota,')) {
            currentTable = "cuota";
            console.log(`Encontrado header cuota en línea ${i}: ${line.substring(0, 50)}`);
            continue;
        } else if (line.includes("idsolicitud,") || line.includes('"idsolicitud,')) {
            currentTable = "solicitud";
            console.log(`Encontrado header solicitud en línea ${i}: ${line.substring(0, 50)}`);
            continue;
        } else if (line.includes("idadelanto,") || line.includes("idlocalidad,") || line.includes("idproducto,") || line.includes("iduser,") || line.includes("idvendedor,")) {
            currentTable = "other";
            continue;
        }

        if (currentTable === "other" || !line.trim()) continue;

        const cols = parseCsvLine(line);

        try {
            if (currentTable === "cliente" && cols.length >= 8) {
                clientesCsv.push({
                    idcliente: parseInt(cols[0]),
                    relalocalidad: cols[1],
                    appynom: cols[2],
                    dni: cols[3],
                    direccion: cols[4],
                    telefono: cols[5],
                    condicion: cols[6],
                    fechalta: parseDate(cols[7])
                });
            } else if (currentTable === "cuota" && cols.length >= 8) {
                cuotasCsv.push({
                    idcuota: parseInt(cols[0]),
                    relasolicitud: parseInt(cols[1]),
                    nrocuota: parseInt(cols[2]),
                    importe: parseFloat(cols[3]) || 0,
                    fecha: parseDate(cols[4]),
                    vencimiento: parseDate(cols[5]) || new Date().toISOString().split('T')[0],
                    saldoanterior: parseFloat(cols[6]) || 0,
                    estado: parseInt(cols[7]) || 0
                });
            } else if (currentTable === "solicitud" && cols.length >= 13) {
                solicitudesCsv.push({
                    idsolicitud: parseInt(cols[0]),
                    relacliente: parseInt(cols[1]),
                    relaproducto: parseInt(cols[2]),
                    relavendedor: parseInt(cols[3]),
                    monto: parseFloat(cols[4]) || 0,
                    cantidadcuotas: parseInt(cols[5]) || 0,
                    totalabonado: parseFloat(cols[6]) || 0,
                    fechalta: parseDate(cols[7]),
                    nrosolicitud: cols[8],
                    totalapagar: parseFloat(cols[9]) || 0,
                    porcentajepagado: parseFloat(cols[10]) || 0,
                    observacion: cols[11],
                    estado: parseInt(cols[12]) || 0
                });
            }
            parsedRowCount++;
        } catch (err) {
            console.warn(`⚠️ Error parseando línea en tabla ${currentTable}: ${line.substring(0, 50)}...`);
        }
    }

    console.log(`✅ Parseo terminado. Encontrados:`);
    console.log(`   - Clientes: ${clientesCsv.length}`);
    console.log(`   - Solicitudes: ${solicitudesCsv.length}`);
    console.log(`   - Cuotas: ${cuotasCsv.length}`);

    // Mapa de idcliente del CSV a idcliente de Supabase
    const mapCsvIdToSupabaseId = new Map<number, number>();

    // 1. MIGRAR CLIENTES
    console.log("\n==================================");
    console.log("👤 INICIANDO MIGRACIÓN DE CLIENTES");
    console.log("==================================");

    // Obtener clientes existentes para mapear por DNI
    const { data: dbClientes, error: errDbClientes } = await supabase.from('cliente').select('idcliente, dni, appynom');
    if (errDbClientes) {
        console.error("Error obteniendo clientes de DB:", errDbClientes);
        return;
    }

    const dniToDbId = new Map<string, number>();
    dbClientes?.forEach(c => {
        if (c.dni) dniToDbId.set(cleanDni(c.dni), c.idcliente);
    });

    let newClients = 0;
    let updatedClients = 0;

    // Iterar en chunks para no saturar 
    const chunkSize = 100;
    for (let i = 0; i < clientesCsv.length; i += chunkSize) {
        const chunk = clientesCsv.slice(i, i + chunkSize);

        for (const csvCliente of chunk) {
            const cleanDniStr = cleanDni(csvCliente.dni);
            let supabaseId = dniToDbId.get(cleanDniStr);

            const clienteData = {
                appynom: csvCliente.appynom,
                dni: csvCliente.dni,
                direccion: csvCliente.direccion,
                telefono: csvCliente.telefono,
                fechalta: csvCliente.fechalta || '2020-01-01T00:00:00Z',
                relalocalidad: parseInt(csvCliente.relalocalidad) || 5
            };

            if (supabaseId) {
                // Actualizar existente
                mapCsvIdToSupabaseId.set(csvCliente.idcliente, supabaseId);
                updatedClients++;
                if (!isDryRun) {
                    await supabase.from('cliente').update(clienteData).eq('idcliente', supabaseId);
                }
            } else if (cleanDniStr) {
                // Crear nuevo (solo si tiene un DNI más o menos válido)
                newClients++;
                if (!isDryRun) {
                    const { data, error } = await supabase.from('cliente').insert(clienteData).select('idcliente').single();
                    if (data && !error) {
                        mapCsvIdToSupabaseId.set(csvCliente.idcliente, data.idcliente);
                        dniToDbId.set(cleanDniStr, data.idcliente);
                    } else {
                        console.error(`Error insertando cliente ${csvCliente.appynom}:`, error);
                    }
                } else {
                    // Asumo un ID fake para dry run
                    mapCsvIdToSupabaseId.set(csvCliente.idcliente, -1 * newClients);
                }
            }
        }

        if (i % 500 === 0) console.log(`   Procesados ${i}/${clientesCsv.length} clientes...`);
    }

    console.log(`✅ Clientes: ${newClients} nuevos, ${updatedClients} actualizados (total mapeados: ${mapCsvIdToSupabaseId.size})`);

    // 2. MIGRAR SOLICITUDES
    console.log("\n=====================================");
    console.log("📝 INICIANDO MIGRACIÓN DE SOLICITUDES");
    console.log("=====================================");

    let newSolicitudes = 0;
    let updatedSolicitudes = 0;
    let missingClientCount = 0;

    const solicitudesAceptadas = new Set<number>();

    // Agrupar requests de actualización para solicitudes (como Upsert por ID)
    for (let i = 0; i < solicitudesCsv.length; i += chunkSize) {
        const chunk = solicitudesCsv.slice(i, i + chunkSize);

        for (const sol of chunk) {
            const dbClientId = mapCsvIdToSupabaseId.get(sol.relacliente);

            if (!dbClientId) {
                missingClientCount++;
                continue;
            }

            const solData = {
                idsolicitud: sol.idsolicitud,
                relacliente: dbClientId, // Usamos el ID mapeado
                relaproducto: sol.relaproducto,
                relavendedor: sol.relavendedor,
                monto: sol.monto,
                cantidadcuotas: sol.cantidadcuotas,
                totalabonado: sol.totalabonado,
                fechalta: sol.fechalta || '2020-01-01T00:00:00Z',
                nrosolicitud: sol.nrosolicitud,
                totalapagar: sol.totalapagar,
                porcentajepagado: sol.porcentajepagado,
                observacion: sol.observacion,
                estado: sol.estado
            };

            if (!isDryRun) {
                const { error } = await supabase.from('solicitud').upsert(solData, { onConflict: 'idsolicitud' });
                if (error) {
                    console.error(`Error en upsert de solicitud ${sol.idsolicitud}:`, error);
                } else {
                    updatedSolicitudes++;
                    solicitudesAceptadas.add(sol.idsolicitud);
                }
            } else {
                updatedSolicitudes++;
                solicitudesAceptadas.add(sol.idsolicitud);
            }
        }

        if (i % 500 === 0) console.log(`   Procesadas ${i}/${solicitudesCsv.length} solicitudes...`);
    }

    console.log(`✅ Solicitudes: ${updatedSolicitudes} procesadas por Upsert. Omitidas por falta de cliente: ${missingClientCount}`);

    // 3. MIGRAR CUOTAS
    console.log("\n================================");
    console.log("💰 INICIANDO MIGRACIÓN DE CUOTAS");
    console.log("================================");

    let upsertedCuotas = 0;
    let chunkCount = 0;

    // Utilizaremos un enfoque de upsert por lotes para las cuotas porque son demasiadas
    // IMPORTANTE: NO incluir idcuota, porque el ID del CSV conflicto con los IDs generados por otros scripts.
    // Usamos la constraint uq_cuotas_solicitud_nrocuota proporcionando onConflict: 'relasolicitud,nrocuota'
    const dataToUpsert = cuotasCsv
        .filter(c => solicitudesAceptadas.has(c.relasolicitud))
        .map(c => ({
            relasolicitud: c.relasolicitud,
            nrocuota: c.nrocuota,
            importe: c.importe,
            fecha: c.fecha,
            vencimiento: c.vencimiento,
            saldoanterior: c.saldoanterior,
            estado: c.estado
        }));

    const cuotaChunkSize = 200; // Chunk más grande para inserts bulk
    for (let i = 0; i < dataToUpsert.length; i += cuotaChunkSize) {
        const chunk = dataToUpsert.slice(i, i + cuotaChunkSize);

        if (!isDryRun) {
            const { error } = await supabase.from('cuotas').upsert(chunk, { onConflict: 'relasolicitud,nrocuota' });
            if (error) {
                console.error(`Error en upsert de chunk de cuotas (idx ${i}):`, error);
            } else {
                upsertedCuotas += chunk.length;
            }
        } else {
            upsertedCuotas += chunk.length;
        }

        chunkCount++;
        if (chunkCount % 20 === 0) console.log(`   Procesadas ${i + chunk.length}/${dataToUpsert.length} cuotas...`);
    }

    console.log(`✅ Cuotas: ${upsertedCuotas} procesadas por Upsert en lotes.`);

    console.log("\n🎉 MIGRACIÓN FINALIZADA");
    if (isDryRun) {
        console.log("⚠️ NOTA: Esto fue un DRY-RUN, no se modificó la base de datos.");
        console.log("   Para aplicar los cambios, ejecuta el script sin --dry-run.");
    }
}

migrateData().catch(console.error);
