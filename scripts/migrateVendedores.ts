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
const VendedorSchema = z.object({
    idvendedor: z.number(),
    apellidonombre: z.string(),
    direccion: z.string().nullable(),
    cel: z.string().nullable(),
});

type Vendedor = z.infer<typeof VendedorSchema>;

async function migrateVendedores(dryRun: boolean = false) {
    console.log(`Starting Vendedor migration... (Dry Run: ${dryRun})`);

    try {
        const sqlContent = fs.readFileSync(SQL_FILE_PATH, 'utf-8');

        // Regex to capture the INSERT INTO `vendedor` block
        const insertBlockRegex = /INSERT INTO `vendedor` [^;]+;/;
        const match = sqlContent.match(insertBlockRegex);

        if (!match) {
            console.error('Could not find INSERT INTO `vendedor` block in SQL file.');
            return;
        }

        const insertStatement = match[0];
        const valuesStartTime = insertStatement.indexOf('VALUES') + 6;
        const valuesPart = insertStatement.substring(valuesStartTime).trim();

        // Regex to match each row: (val1, val2, ...)
        // Handles parentheses inside strings if they are quoted
        const rowRegex = /\((?:[^)(]+|'[^']*')+\)/g;
        const rows: string[] = [];
        let matchRow;

        while ((matchRow = rowRegex.exec(valuesPart)) !== null) {
            rows.push(matchRow[0].slice(1, -1)); // Remove outer parens
        }

        const vendedores: Vendedor[] = [];
        let parseErrors = 0;

        console.log(`Found ${rows.length} rows to process.`);

        for (const row of rows) {
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
            values.push(currentVal.trim());

            // Expected columns: idvendedor, apellidonombre, direccion, cel
            if (values.length !== 4) {
                console.warn(`Skipping row due to unexpected column count (${values.length}): ${row}`);
                parseErrors++;
                continue;
            }

            const idvendedor = parseInt(values[0], 10);
            const apellidonombre = values[1].replace(/^'|'$/g, '').trim();

            let direccion: string | null = values[2].replace(/^'|'$/g, '').trim();
            if (direccion.toLowerCase() === 'null') direccion = null;

            let cel: string | null = values[3].replace(/^'|'$/g, '').trim();
            if (cel.toLowerCase() === 'null') cel = null;

            const vendedorData = {
                idvendedor,
                apellidonombre,
                direccion,
                cel
            };

            const result = VendedorSchema.safeParse(vendedorData);
            if (result.success) {
                vendedores.push(result.data);
            } else {
                console.warn(`Validation failed for vendedor ${idvendedor}:`, result.error);
                parseErrors++;
            }
        }

        console.log(`Parsed ${vendedores.length} valid records.`);
        if (parseErrors > 0) console.warn(`Encountered ${parseErrors} parse errors.`);

        if (dryRun) {
            console.log('Dry run complete. Sample record:', vendedores[0]);
            return;
        }

        // Insert in batches
        const BATCH_SIZE = 100;
        for (let i = 0; i < vendedores.length; i += BATCH_SIZE) {
            const batch = vendedores.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('vendedor').upsert(batch);

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

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

migrateVendedores(isDryRun);
