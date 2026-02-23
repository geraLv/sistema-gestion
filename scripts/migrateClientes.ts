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
const ClienteSchema = z.object({
    idcliente: z.number(),
    relalocalidad: z.number(),
    appynom: z.string(),
    dni: z.string(),
    direccion: z.string().nullable(),
    telefono: z.string().nullable(),
    condicion: z.number().nullable(),
    fechalta: z.string(), // ISO string
    email: z.string().nullable().optional(),
});

type Cliente = z.infer<typeof ClienteSchema>;

async function migrateClientes(dryRun: boolean = false) {
    console.log(`Starting Cliente migration... (Dry Run: ${dryRun})`);

    try {
        const sqlContent = fs.readFileSync(SQL_FILE_PATH, 'utf-8');

        // Regex to capture the INSERT INTO `cliente` block
        // We look for the start of the insert block and take everything until the semi-colon
        const insertBlockRegex = /INSERT INTO `cliente` [^;]+;/;
        const match = sqlContent.match(insertBlockRegex);

        if (!match) {
            console.error('Could not find INSERT INTO `cliente` block in SQL file.');
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

        const clientes: Cliente[] = [];
        let parseErrors = 0;

        console.log(`Found ${rows.length} rows to process.`);

        for (const row of rows) {
            // Manual CSV-like parsing logic because splitting by comma is unsafe with quoted strings containing commas
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

            // Expected columns based on SQL: 
            // idcliente, relalocalidad, appynom, dni, direccion, telefono, condicion, fechalta
            if (values.length !== 8) {
                console.warn(`Skipping row due to unexpected column count (${values.length}): ${row}`);
                parseErrors++;
                continue;
            }

            const idcliente = parseInt(values[0], 10);
            const relalocalidad = parseInt(values[1], 10);
            const appynom = values[2].replace(/^'|'$/g, '').trim();
            const dni = values[3].replace(/^'|'$/g, '').trim();

            let direccion: string | null = values[4].replace(/^'|'$/g, '').trim();
            if (direccion.toLowerCase() === 'null') direccion = null;

            let telefono: string | null = values[5].replace(/^'|'$/g, '').trim();
            if (telefono.toLowerCase() === 'null') telefono = null;

            let condicion: number | null = parseInt(values[6], 10);
            if (isNaN(condicion)) condicion = null;

            let fechaltaRaw = values[7].replace(/^'|'$/g, '').trim();
            let fechalta: string;

            // Handle invalid dates like '0000-00-00 00:00:00'
            if (fechaltaRaw.startsWith('0000-00-00') || fechaltaRaw === '0000-00-00') {
                // Default to a fallback date or current date?
                // Since this is "Creation Date", using current date for old records might be misleading, 
                // but better than failing. Or we can use a fixed old date like 2000-01-01.
                // Let's use 2000-01-01T00:00:00Z to indicate unknown old date
                fechalta = '2000-01-01T00:00:00Z';
            } else {
                // Attempt to parse date
                // SQL format is usually YYYY-MM-DD HH:mm:ss
                try {
                    // Append Z to treat as UTC or let it be local? 
                    // Ideally we'd parse explicitly. For migration simplicty, creating a Date object works for standard ISO-like strings.
                    const d = new Date(fechaltaRaw);
                    if (isNaN(d.getTime())) {
                        fechalta = new Date().toISOString(); // Fallback
                    } else {
                        fechalta = d.toISOString();
                    }
                } catch (e) {
                    fechalta = new Date().toISOString();
                }
            }

            const clienteData = {
                idcliente,
                relalocalidad,
                appynom,
                dni,
                direccion,
                telefono,
                condicion,
                fechalta,
                email: null // Default null as it's optional and not in source
            };

            const result = ClienteSchema.safeParse(clienteData);
            if (result.success) {
                clientes.push(result.data);
            } else {
                console.warn(`Validation failed for client ${idcliente}:`, result.error);
                parseErrors++;
            }
        }

        console.log(`Parsed ${clientes.length} valid records.`);
        if (parseErrors > 0) console.warn(`Encountered ${parseErrors} parse errors.`);

        if (dryRun) {
            console.log('Dry run complete. Sample record:', clientes[0]);
            // Show a record with corrected date if possible
            const correctedDate = clientes.find(c => c.fechalta === '2000-01-01T00:00:00Z');
            if (correctedDate) {
                console.log('Sample record with corrected date:', correctedDate);
            }
            return;
        }

        // Insert in batches
        const BATCH_SIZE = 100;
        for (let i = 0; i < clientes.length; i += BATCH_SIZE) {
            const batch = clientes.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('cliente').upsert(batch);

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

migrateClientes(isDryRun);
