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

async function syncClients() {
  const existingDnis = new Set<string>();
  let from = 0;
  let step = 1000;
  while (true) {
    const { data } = await supabase.from("cliente").select("dni").range(from, from + step - 1);
    if (!data || data.length === 0) break;
    data.forEach(c => c.dni && existingDnis.add(c.dni.replace(/\./g, "").trim()));
    if (data.length < step) break;
    from += step;
  }
  
  const filePath = path.resolve(__dirname, "../../DOC PROGRAMADOR.csv");
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentLine = 0;
  const newClients = [];
  let inserted = 0;

  for await (const line of rl) {
    currentLine++;

    if (currentLine >= 2 && currentLine <= 1783) {
      if (line.includes(",") && line.includes("\"")) {
        const cleanLine = line.replace(/^"|"$/g, ""); 
        
        // This regex perfectly captures CSV with double quotes like 1,"32","GONZALEZ"
        let p = cleanLine.split('","');
        
        // Fallback or double quoted handling ""32""
        if (p.length < 5) {
             p = cleanLine.split('",""');
        }

        // Clean any remaining quotes
        for(let k=0; k<p.length; k++) p[k] = p[k].replace(/"/g, "");

        let plainSplit = p[0].split(",");
        if(plainSplit.length > 1) {
            p.shift();
            p.unshift(plainSplit[1]); 
            p.unshift(plainSplit[0]);
        }

        if (p.length >= 8) {
            const locRaw = p[1];
            const nomRaw = p[2];
            let dniRaw = p[3];
            const dirRaw = p[4];
            const telRaw = p[5];
            const condRaw = p[6];
            const dateRaw = p[7];

            const relalocalidad = parseInt(locRaw, 10);
            const appynom = nomRaw.trim();
            
            // Si el DNI vino como texto raro o palabras, lo pasamos a un numero generico o limpio
            let dniStr = dniRaw.trim();
            if (dniStr.includes('HOTEL') || dniStr.includes('BARRIO') || dniStr.length > 15) {
                // If column shifting occurred due to bad commas, we inject a placeholder
                dniStr = "0000";
            } else if (dniStr.includes(',,')) {
                dniStr = dniStr.split(',,')[0];
            }

            const dniClean = dniStr.replace(/\./g, "").trim();
            const safeDni = dniClean.substring(0, 12);
            
            let direccion = dirRaw ? dirRaw.trim() : "";
            let telefono = telRaw ? telRaw.trim() : "";
            let condicion = parseInt(condRaw, 10);
            
            let fechaltaRaw = dateRaw ? dateRaw.replace(/["']/g, "").trim() : "";
            let fechalta = new Date().toISOString();
            if (fechaltaRaw && fechaltaRaw !== "0000-00-00 00:00:00") {
                try {
                   const d = new Date(fechaltaRaw.replace(/""$/, ""));
                   if (!isNaN(d.getTime())) fechalta = d.toISOString();
                } catch (e) {}
            }

            // Aceptamos if it's safe and doesn't exist
             if (!existingDnis.has(dniClean)) { 
                existingDnis.add(dniClean); // Prevent duplication in same loop
                newClients.push({
                    relalocalidad: isNaN(relalocalidad) ? null : relalocalidad,
                    appynom: appynom.substring(0, 100),
                    dni: safeDni.length > 3 ? safeDni : "0000",
                    direccion: (direccion || null)?.substring(0, 100) || null,
                    telefono: (telefono || null)?.substring(0, 50) || null,
                    condicion: isNaN(condicion) ? 1 : condicion,
                    fechalta,
                    email: null
                });
            }
        }
      }
    } 
    if (currentLine > 1785) break;
  }

  for (const c of newClients) {
       // verify safe schema locally before Postgres
       if (c.dni.length <= 12 && c.appynom.length <= 100) {
           const { error } = await supabase.from("cliente").insert([c]);
           if (!error) {
               inserted++;
           } else {
               console.log("Failed:", c.dni, error.message);
           }
       }
  }

  console.log(`Successfully recovered ${inserted} clients.`);
}

syncClients();
