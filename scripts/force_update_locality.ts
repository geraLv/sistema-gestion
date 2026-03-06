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

async function forceUpdateLocality() {
    console.log("Fetching all clients from DB to check localities...");
    const dbDnis = new Map<string, { idcliente: number, relalocalidad: number | null }>();

    let from = 0;
    let step = 1000;
    while (true) {
        const { data } = await supabase.from("cliente").select("idcliente, dni, relalocalidad").range(from, from + step - 1);
        if (!data || data.length === 0) break;
        data.forEach(c => {
            if (c.dni) {
                dbDnis.set(c.dni.replace(/\./g, "").trim(), { idcliente: c.idcliente, relalocalidad: c.relalocalidad });
            }
        });
        if (data.length < step) break;
        from += step;
    }

    const filePath = path.resolve(__dirname, "../../DOC PROGRAMADOR.csv");
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let currentLine = 0;
    let updatedCount = 0;
    let errorsCount = 0;

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
                    let dniStr = p[3].trim();
                    if (dniStr.includes(',,')) dniStr = dniStr.split(',,')[0];

                    const dniClean = dniStr.replace(/\./g, "").trim();

                    if (dniClean.length > 3 && !dniClean.includes("HOTEL") && !dniClean.includes("BARRIO")) {
                        if (dbDnis.has(dniClean)) {
                            const dbRecord = dbDnis.get(dniClean);
                            if (dbRecord && dbRecord.relalocalidad !== relalocalidadCsv && !isNaN(relalocalidadCsv)) {
                                // Needs update
                                console.log(`Updating DNI ${dniClean} | DB says ${dbRecord.relalocalidad} -> CSV says ${relalocalidadCsv}`);

                                const { error } = await supabase
                                    .from("cliente")
                                    .update({ relalocalidad: relalocalidadCsv })
                                    .eq("idcliente", dbRecord.idcliente);

                                if (error) {
                                    console.error(`Failed to update ${dniClean}:`, error.message);
                                    errorsCount++;
                                } else {
                                    updatedCount++;
                                    // update local map so we don't do it again if duplicated in CSV
                                    dbDnis.set(dniClean, { idcliente: dbRecord.idcliente, relalocalidad: relalocalidadCsv });
                                }
                            }
                        }
                    }
                }
            }
        }
        if (currentLine > 1785) break;
    }

    console.log(`\n=== UPDATE RESULT ===`);
    console.log(`Successfully updated ${updatedCount} clients' localities to match the CSV.`);
    console.log(`Errors encountered: ${errorsCount}`);
}

forceUpdateLocality();
