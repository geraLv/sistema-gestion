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

async function migrateProductos() {
    const sqlPath = path.resolve(__dirname, '../../gestion.sql'); // Adjust path as needed
    console.log(`Reading SQL file from: ${sqlPath}`);

    try {
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        const lines = sqlContent.split('\n');

        // Regex to match INSERT INTO `producto` ... VALUES (...)
        // Matches: (4, 'Usado', '', 0, NULL, NULL),
        // Columns: idproducto, descripcion, marca, tipo, precio, detalles
        const insertRegex = /^\((\d+),\s*'([^']*)',\s*'([^']*)',\s*(\d+),\s*(NULL|[\d.]+),\s*(NULL|'[^']*')\)[,;]/;

        let count = 0;
        const productosToInsert = [];

        // Find the start of INSERT INTO `producto`
        let isInProductoSection = false;

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('INSERT INTO `producto`')) {
                isInProductoSection = true;
                continue;
            }

            if (isInProductoSection) {
                if (trimmedLine === '' || trimmedLine.startsWith('--') || trimmedLine.startsWith('/*')) continue;

                // If we hit another INSERT or CREATE, stop
                if (trimmedLine.startsWith('INSERT INTO') || trimmedLine.startsWith('CREATE TABLE')) {
                    isInProductoSection = false;
                    // Don't break immediately, just stop processing as producto lines
                    if (trimmedLine.startsWith('INSERT INTO `producto`')) {
                        isInProductoSection = true; // resumed? unlikely for this dump format but safety
                        continue;
                    }
                }

                if (!isInProductoSection) continue;

                const match = trimmedLine.match(insertRegex);
                if (match) {
                    const idproducto = parseInt(match[1]);
                    const descripcion = match[2];
                    const marca = match[3];
                    const tipo = parseInt(match[4]);
                    const precioRaw = match[5];

                    let precio = 0;
                    if (precioRaw !== 'NULL') {
                        precio = parseFloat(precioRaw);
                    }

                    // Typescript interface: relaproducto, descripcion, precio, estado?
                    // We assume 'relaproducto' is the ID in Supabase.
                    // We assume 'estado' defaults to 1 (active).

                    const producto = {
                        idproducto: idproducto,
                        descripcion: descripcion,
                        marca: marca,
                        tipo: tipo,
                        precio: precio
                    };

                    productosToInsert.push(producto);
                    count++;
                }
            }
        }

        console.log(`Found ${count} productos to migrate.`);

        if (process.argv.includes('--dry-run')) {
            console.log('Dry run: logging first 5 items');
            console.log(JSON.stringify(productosToInsert.slice(0, 5), null, 2));
            return;
        }

        // Insert into Supabase
        if (productosToInsert.length > 0) {
            const { data, error } = await supabase
                .from('producto')
                .upsert(productosToInsert, { onConflict: 'idproducto' });

            if (error) {
                console.error('Error migrating productos:', error);
            } else {
                console.log(`Successfully migrated ${productosToInsert.length} productos.`);
            }
        } else {
            console.log('No productos found to migrate.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrateProductos();
