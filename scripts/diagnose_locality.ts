import fs from "fs";
import readline from "readline";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) process.exit(1);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagnoseMismatch() {
    console.log("Fetching all clients from DB to check localities...");
    const dbDnis = new Map<string, number | null>(); // Map of cleanDNI -> relalocalidad

    let from = 0;
    let step = 1000;
    while (true) {
        const { data } = await supabase.from("cliente").select("dni, relalocalidad").range(from, from + step - 1);
        if (!data || data.length === 0) break;
        data.forEach(c => {
            if (c.dni) {
                dbDnis.set(c.dni.replace(/\./g, "").trim(), c.relalocalidad);
            }
        });
        if (data.length < step) break;
        from += step;
    }

    const filePath = path.resolve(__dirname, "../../DOC PROGRAMADOR.csv");
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let currentLine = 0;
    let mismatchedLocality = 0;
    const mismatchedDetails = [];

    for await (const line of rl) {
        currentLine++;
        if (currentLine >= 2 && currentLine <= 1783) {
            if (line.includes(",") && line.includes("\"")) {
                const cleanLine = line.replace(/^"|"$/g, "");
                let p = cleanLine.split('","');
                if (p.length < 5) p = cleanLine.split('",""');
                for (let k = 0; k < p.length; k++) p[k] = p[k].replace(/"/g, "");

                let plainSplit = p[0].split(",");
                if (plainSplit.length > 1) {
                    p.shift();
                    p.unshift(plainSplit[1]);
                    p.unshift(plainSplit[0]);
                }

                if (p.length >= 8) {
                    const relalocalidadCsv = parseInt(p[1], 10);
                    const appynom = p[2].trim();
                    let dniStr = p[3].trim();
                    if (dniStr.includes(',,')) dniStr = dniStr.split(',,')[0];

                    const dniClean = dniStr.replace(/\./g, "").trim();

                    if (dniClean.length > 3 && !dniClean.includes("HOTEL") && !dniClean.includes("BARRIO")) {
                        if (relalocalidadCsv === 32) {
                            if (dbDnis.has(dniClean)) {
                                const dbLocality = dbDnis.get(dniClean);
                                if (dbLocality !== 32) {
                                    // The CSV says Locality 32, but the DB says something else!
                                    mismatchedLocality++;
                                    // Only save a few to show the user
                                    if (mismatchedDetails.length < 10) {
                                        mismatchedDetails.push(`DNI: ${dniStr} | Nombre: ${appynom} | CSV Dice: 32 | BD Dice: ${dbLocality}`);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        if (currentLine > 1785) break;
    }

    console.log(`=== REPORTE DE DISCREPANCIAS DE LOCALIDAD ===`);
    console.log(`De todos los clientes que en el CSV figuran con localidad 32...`);
    console.log(`¡Encontramos que hay ${mismatchedLocality} clientes cuyo DNI ya existe en la Base de Datos, pero están asignados a OTRA localidad (o localidad NULL)!`);

    if (mismatchedLocality > 0) {
        console.log(`\nEjemplos de discrepancias:`);
        mismatchedDetails.forEach(d => console.log(d));
    }
}

diagnoseMismatch();
