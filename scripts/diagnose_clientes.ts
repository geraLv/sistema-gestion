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

async function diagnose() {
    const dbDnis = new Set<string>();
    let from = 0;
    let step = 1000;
    while (true) {
        const { data } = await supabase.from("cliente").select("dni").range(from, from + step - 1);
        if (!data || data.length === 0) break;
        data.forEach(c => c.dni && dbDnis.add(c.dni.replace(/\./g, "").trim()));
        if (data.length < step) break;
        from += step;
    }

    const filePath = path.resolve(__dirname, "../../DOC PROGRAMADOR.csv");
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let currentLine = 0;
    const csvUniqueDnis = new Set<string>();
    let csvTotalRows = 0;
    let csvLocality32Total = 0;
    let csvLocality32Unique = new Set<string>();

    const missingFromDb = [];

    for await (const line of rl) {
        currentLine++;
        if (currentLine >= 2 && currentLine <= 1783) {
            csvTotalRows++;
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
                    const relalocalidad = parseInt(p[1], 10);
                    const appynom = p[2].trim();
                    let dniStr = p[3].trim();

                    if (dniStr.includes(',,')) {
                        dniStr = dniStr.split(',,')[0];
                    }

                    const dniClean = dniStr.replace(/\./g, "").trim();
                    if (dniClean.length > 3 && !dniClean.includes("HOTEL") && !dniClean.includes("BARRIO")) {
                        csvUniqueDnis.add(dniClean);

                        if (relalocalidad === 32) {
                            csvLocality32Total++;
                            csvLocality32Unique.add(dniClean);
                        }

                        if (!dbDnis.has(dniClean)) {
                            // It's missing from DB
                            // Prevent pushing duplicates
                            let alreadyAdded = missingFromDb.find(m => m.dniClean === dniClean);
                            if (!alreadyAdded) {
                                missingFromDb.push({
                                    dniClean,
                                    appynom,
                                    relalocalidad,
                                    originalRow: line
                                });
                            }
                        }
                    }
                }
            }
        }
        if (currentLine > 1785) break;
    }

    console.log("=== REPORTE DE DIAGNÓSTICO ===");
    console.log(`Total de registros en tu Base de Datos: 1671`);
    console.log(`Total de DNIs únicos en tu Base de Datos: ${dbDnis.size}`);
    console.log(`--`);
    console.log(`Total de filas entre la línea 2 y 1783 del CSV: ${csvTotalRows}`);
    console.log(`Total de DNIs únicos en ese bloque del CSV: ${csvUniqueDnis.size}`);
    console.log(`--`);
    let dbHas = 0;
    for (const d of csvUniqueDnis) {
        if (dbDnis.has(d)) dbHas++;
    }
    console.log(`De los ${csvUniqueDnis.size} únicos en el CSV, la Base de Datos YA TIENE: ${dbHas}`);
    console.log(`De los ${csvUniqueDnis.size} únicos en el CSV, FALTAN en la Base de Datos: ${csvUniqueDnis.size - dbHas}`);

    console.log(`\n=== LOCALIDAD 32 ===`);
    console.log(`Filas (repetidas o no) con localidad 32 en CSV: ${csvLocality32Total}`);
    console.log(`DNIs únicos con localidad 32 en CSV: ${csvLocality32Unique.size}`);

    let loc32InDb = 0;
    for (const d of csvLocality32Unique) {
        if (dbDnis.has(d)) loc32InDb++;
    }
    console.log(`De esos DNIs únicos 32, ya están en tu DB: ${loc32InDb}`);
    console.log(`Faltaban en tu DB (loc 32): ${csvLocality32Unique.size - loc32InDb}`);


    console.log(`\n=== CLIENTES FALTANTES A INSERTAR (${missingFromDb.length}) ===`);
    for (const m of missingFromDb) {
        console.log(`- DNI: ${m.dniClean} | Nombre: ${m.appynom} | Loc: ${m.relalocalidad}`);
    }
}

diagnose();
