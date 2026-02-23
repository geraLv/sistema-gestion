import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SQL_FILE_PATH = path.resolve(__dirname, '../../gestion.sql');

// Schema for validation
const LocalidadSchema = z.object({
    idlocalidad: z.number(),
    provincia: z.string(),
    departamento: z.string(),
    localidad: z.string(),
    nombre: z.string(),
    coordenadas: z.string().nullable(),
});

type Localidad = z.infer<typeof LocalidadSchema>;

async function migrateLocalidades(dryRun: boolean = false) {
    console.log(`Starting migration... (Dry Run: ${dryRun})`);

    try {
        const sqlContent = fs.readFileSync(SQL_FILE_PATH, 'utf-8');

        // Regex to capture the INSERT INTO `localidad` block
        // This is a simplified regex, assuming standard mysqldump format
        const insertBlockRegex = /INSERT INTO `localidad` [^;]+;/;
        const match = sqlContent.match(insertBlockRegex);

        if (!match) {
            console.error('Could not find INSERT INTO `localidad` block in SQL file.');
            return;
        }

        const insertStatement = match[0];

        // Extract values part: VALUES (1, ...), (2, ...)
        const valuesStartTime = insertStatement.indexOf('VALUES') + 6;
        const valuesPart = insertStatement.substring(valuesStartTime).trim();

        // Regex to match each row: (val1, val2, ...)
        // Matches opening paren, followed by (anything not parens OR a quoted string) repeated, then closing paren
        // This handles ')' inside quotes, e.g. 'Text (with parens)'
        const rowRegex = /\((?:[^)(]+|'[^']*')+\)/g;
        const rows: string[] = [];
        let matchRow;

        while ((matchRow = rowRegex.exec(valuesPart)) !== null) {
            rows.push(matchRow[0].slice(1, -1)); // Remove outer parens
        }

        const localidades: Localidad[] = [];
        let parseErrors = 0;

        console.log(`Found ${rows.length} rows to process.`);

        for (const row of rows) {
            // Split by comma, respecting quotes is hard with simple split. 
            // We'll use a regex to match values.
            // Values are: id, 'prov', 'depto', 'loc', 'nom', 'coord'

            // Simple CSV-like parser for SQL values
            const values: string[] = [];
            let currentVal = '';
            let inQuote = false;

            for (let i = 0; i < row.length; i++) {
                const char = row[i];
                if (char === "'" && (i === 0 || row[i - 1] !== '\\')) {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    values.push(currentVal.trim());
                    currentVal = '';
                } else {
                    currentVal += char;
                }
            }
            values.push(currentVal.trim()); // Push last value

            if (values.length !== 6) {
                console.warn(`Skipping row due to unexpected column count (${values.length}): ${row}`);
                parseErrors++;
                continue;
            }

            // Parse and clean values
            const idlocalidad = parseInt(values[0], 10);
            const provincia = values[1].replace(/^'|'$/g, '').trim();
            const departamento = values[2].replace(/^'|'$/g, '').trim();
            const localidad = values[3].replace(/^'|'$/g, '').trim();
            const nombre = values[4].replace(/^'|'$/g, '').trim();
            let coordenadas: string | null = values[5].replace(/^'|'$/g, '').trim();

            if (coordenadas === 'NULL' || coordenadas === '') coordenadas = null;

            const locData = {
                idlocalidad,
                provincia,
                departamento,
                localidad,
                nombre,
                coordenadas
            };

            const result = LocalidadSchema.safeParse(locData);
            if (result.success) {
                localidades.push(result.data);
            } else {
                console.warn(`Validation failed for row: ${row}`, result.error);
                parseErrors++;
            }
        }

        console.log(`Parsed ${localidades.length} valid records.`);
        if (parseErrors > 0) console.warn(`Encountered ${parseErrors} parse errors.`);

        if (dryRun) {
            console.log('Dry run complete. No data inserted.');
            console.log('Sample record:', localidades[0]);
            return;
        }

        // Insert in batches
        const BATCH_SIZE = 100;
        for (let i = 0; i < localidades.length; i += BATCH_SIZE) {
            const batch = localidades.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('localidad').upsert(batch);

            if (error) {
                console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error);
            } else {
                console.log(`Inserted batch ${i / BATCH_SIZE + 1} (${batch.length} records)`);
            }
        }

        console.log('Migration complete.');

    } catch (error) {
        console.error('Migration failed:', error);
    }
}

// Check for --dry-run flag
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

migrateLocalidades(isDryRun);
