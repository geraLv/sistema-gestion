import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from backend .env
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateCuotas() {
    const sqlPath = path.resolve(__dirname, '../../gestion.sql');
    console.log(`Reading SQL file from: ${sqlPath}`);

    try {
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        const lines = sqlContent.split('\n');

        // Regex to match INSERT INTO `cuotas` ... VALUES (...)
        const insertRegex = /^\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+),\s*'([^']*)',\s*'([^']*)',\s*([\d.]+),\s*(\d+)\)[,;]/;

        let count = 0;
        const cuotasToInsert = [];
        let isInSection = false;

        // Use a Set for fast lookup of valid solicitudes
        console.log('Fetching existing Solicitud IDs...');
        // We select ALL IDs. If too many, might need pagination or careful fetch.
        const { data: solicitudes } = await supabase.from('solicitud').select('idsolicitud');
        const solicitudIds = new Set(solicitudes?.map(s => s.idsolicitud));
        console.log(`Loaded ${solicitudIds.size} valid solicitudes.`);

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('INSERT INTO `cuotas`')) {
                isInSection = true;
                continue;
            }

            if (isInSection) {
                if (trimmedLine === '' || trimmedLine.startsWith('--') || trimmedLine.startsWith('/*')) continue;

                if (trimmedLine.startsWith('INSERT INTO') || trimmedLine.startsWith('CREATE TABLE')) {
                    isInSection = false;
                    if (trimmedLine.startsWith('INSERT INTO `cuotas`')) {
                        isInSection = true;
                        continue;
                    }
                }

                if (!isInSection) continue;

                const match = trimmedLine.match(insertRegex);
                if (match) {
                    const idcuota = parseInt(match[1]);
                    const relasolicitud = parseInt(match[2]);
                    const nrocuota = parseInt(match[3]);
                    const importe = parseFloat(match[4]);

                    const fechaRaw = match[5];
                    let fecha = null;
                    // Handle various zero date formats
                    if (fechaRaw !== '0000-00-00 00:00:00' && fechaRaw !== '0000-00-00') {
                        fecha = fechaRaw;
                    }

                    const vencimientoRaw = match[6];
                    let vencimiento = null;
                    if (vencimientoRaw !== '0000-00-00 00:00:00' && vencimientoRaw !== '0000-00-00') {
                        vencimiento = vencimientoRaw;
                    }

                    const saldoanterior = parseFloat(match[7]);
                    const estado = parseInt(match[8]);

                    // Filter orphans immediately to save memory
                    if (!solicitudIds.has(relasolicitud)) {
                        // console.warn(`Skipping cuota ${idcuota}: Solicitud ${relasolicitud} not found.`);
                        continue;
                    }

                    const cuota = {
                        idcuota,
                        relasolicitud,
                        nrocuota,
                        importe,
                        fecha,
                        vencimiento,
                        saldoanterior,
                        estado
                    };

                    cuotasToInsert.push(cuota);
                    count++;
                }
            }
        }

        console.log(`Found ${count} valid cuotas to migrate (after filtering).`);

        if (process.argv.includes('--dry-run')) {
            console.log('Dry run: logging first 5 items');
            console.log(JSON.stringify(cuotasToInsert.slice(0, 5), null, 2));
            return;
        }

        // Batch insert
        const BATCH_SIZE = 100;
        for (let i = 0; i < cuotasToInsert.length; i += BATCH_SIZE) {
            const batch = cuotasToInsert.slice(i, i + BATCH_SIZE);
            const { error } = await supabase
                .from('cuotas')
                .upsert(batch, { onConflict: 'idcuota' });

            if (error) {
                console.error(`Error migrating batch ${i} - ${i + BATCH_SIZE}:`, error);
            } else {
                console.log(`Migrated batch ${i} - ${i + batch.length}`);
            }
        }

    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrateCuotas();
