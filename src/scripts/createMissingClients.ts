
import fs from 'fs';
// @ts-ignore
import pdfLib from 'pdf-parse';
const { PDFParse } = pdfLib;
import { supabase } from '../db';

const pdfPath = "C:/Users/ING Nordeste/Desktop/repos/sistema-gestion/sistema-migrado/Reporte de Solicitudes CREDITO GESTION.pdf";

// Default values for required fields without data in PDF
const DEFAULT_LOCALIDAD = 5;   // Formosa - Formosa - Formosa
const DEFAULT_DIRECCION = 'Sin datos';
const DEFAULT_TELEFONO = 'Sin datos';

async function createMissingClients() {
    console.log("🚀 Iniciando creación de clientes faltantes...\n");

    // 1. Load all existing clients (by DNI clean and name)
    console.log("📊 Cargando clientes existentes...");
    let allClients: any[] = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase
            .from('cliente')
            .select('idcliente, appynom, dni')
            .range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        allClients.push(...data);
        if (data.length < 1000) break;
        page++;
    }
    console.log(`✅ Cargados ${allClients.length} clientes existentes.\n`);

    // Build lookup sets: by clean DNI and by normalized name
    const existingDnis = new Set(allClients.map(c => c.dni.replace(/\D/g, '')));
    const existingNames = new Set(allClients.map(c => c.appynom.trim().toUpperCase().replace(/\s+/g, ' ')));

    // 2. Parse PDF
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    const fullText = pdfData.text.replace(/\r?\n/g, ' ');

    const rowRegex = /(\d+)\s+([A-Z\s\.]+?)\s+((?:\d{1,2}\.)?\d{3}(?:\.\d{3})?|\d{7,8})\s+(Usado|0 Km|Moto|0Km)\s+\$([\d\.]+)\s+(\d+)\s+\$([\d\.]+)/g;

    let match;
    // Collect unique clients to insert: map DNI-clean -> {name, dni}
    const toCreate = new Map<string, { name: string; dni: string }>();
    const seenNames = new Set<string>();

    while ((match = rowRegex.exec(fullText)) !== null) {
        const name = match[2].trim().toUpperCase().replace(/\s+/g, ' ');
        const dniRaw = match[3].trim();
        const dniClean = dniRaw.replace(/\D/g, '');

        // Skip if already in DB
        if (existingDnis.has(dniClean) || existingNames.has(name)) continue;

        // Skip duplicates in PDF itself
        if (seenNames.has(name) || toCreate.has(dniClean)) continue;

        seenNames.add(name);
        if (dniClean) toCreate.set(dniClean, { name, dni: dniRaw });
    }

    console.log(`📋 Clientes únicos a crear: ${toCreate.size}\n`);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    // 3. Insert in batches of 50
    const entries = Array.from(toCreate.values());
    const BATCH_SIZE = 50;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const records = batch.map(e => ({
            appynom: e.name,
            dni: e.dni,
            direccion: DEFAULT_DIRECCION,
            telefono: DEFAULT_TELEFONO,
            relalocalidad: DEFAULT_LOCALIDAD,
            condicion: 1,           // activo
            fechalta: new Date().toISOString(),
        }));

        const { error, data } = await supabase.from('cliente').insert(records).select('idcliente');

        if (error) {
            // Could be DNI unique constraint, try one by one
            for (const rec of records) {
                const { error: e2 } = await supabase.from('cliente').insert([rec]);
                if (e2) {
                    console.warn(`⚠️  Skipped ${rec.appynom} (${rec.dni}): ${e2.message}`);
                    skipped++;
                } else {
                    inserted++;
                }
            }
        } else {
            inserted += batch.length;
            process.stdout.write(`\r✅ Insertados: ${inserted}/${toCreate.size}`);
        }
    }

    console.log(`\n\n───────────────────────────────`);
    console.log(`Creados exitosamente: ${inserted}`);
    console.log(`Omitidos (conflicto): ${skipped}`);
    console.log(`Errores: ${errors}`);
}

createMissingClients();
