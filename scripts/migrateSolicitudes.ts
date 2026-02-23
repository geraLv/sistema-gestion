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

async function migrateSolicitudes() {
    const sqlPath = path.resolve(__dirname, '../../gestion.sql');
    console.log(`Reading SQL file from: ${sqlPath}`);

    try {
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        const lines = sqlContent.split('\n');

        // Regex to match INSERT INTO `solicitud` ... VALUES (...)
        const insertRegex = /^\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(NULL|[\d.]+),\s*(NULL|'[^']*'),\s*(NULL|[\d]+),\s*(NULL|[\d.]+),\s*(NULL|[\d.]+),\s*(NULL|'[^']*'),\s*(NULL|[\d]+)\)[,;]/;

        let count = 0;
        const solicitudesToInsert = [];
        let isInSection = false;

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('INSERT INTO `solicitud`')) {
                isInSection = true;
                continue;
            }

            if (isInSection) {
                if (trimmedLine === '' || trimmedLine.startsWith('--') || trimmedLine.startsWith('/*')) continue;

                if (trimmedLine.startsWith('INSERT INTO') || trimmedLine.startsWith('CREATE TABLE')) {
                    isInSection = false;
                    if (trimmedLine.startsWith('INSERT INTO `solicitud`')) {
                        isInSection = true;
                        continue;
                    }
                }

                if (!isInSection) continue;

                const match = trimmedLine.match(insertRegex);
                if (match) {
                    const idsolicitud = parseInt(match[1]);
                    const relacliente = parseInt(match[2]);
                    const relaproducto = parseInt(match[3]);
                    const relavendedor = parseInt(match[4]);
                    const monto = parseInt(match[5]);
                    const cantidadcuotas = parseInt(match[6]);

                    const totalabonadoRaw = match[7];
                    let totalabonado = 0;
                    if (totalabonadoRaw !== 'NULL') totalabonado = parseFloat(totalabonadoRaw);

                    const fechaltaRaw = match[8];
                    let fechalta = null;
                    if (fechaltaRaw !== 'NULL') {
                        const dateStr = fechaltaRaw.replace(/'/g, '');
                        if (dateStr !== '0000-00-00 00:00:00') {
                            fechalta = dateStr;
                        }
                    }

                    const nrosolicitudRaw = match[9];
                    let nrosolicitud = null;
                    if (nrosolicitudRaw !== 'NULL') nrosolicitud = parseInt(nrosolicitudRaw);

                    const totalapagarRaw = match[10];
                    let totalapagar = 0;
                    if (totalapagarRaw !== 'NULL') totalapagar = parseFloat(totalapagarRaw);

                    const porcentajepagadoRaw = match[11];
                    let porcentajepagado = 0;
                    if (porcentajepagadoRaw !== 'NULL') porcentajepagado = parseFloat(porcentajepagadoRaw);

                    const observacionRaw = match[12];
                    let observacion = '';
                    if (observacionRaw !== 'NULL') {
                        observacion = observacionRaw.replace(/^'|'$/g, '');
                    }

                    const estadoRaw = match[13];
                    let estado = 1;
                    if (estadoRaw !== 'NULL') estado = parseInt(estadoRaw);


                    const solicitud = {
                        idsolicitud,
                        relacliente,
                        relaproducto,
                        relavendedor,
                        monto,
                        cantidadcuotas,
                        totalabonado,
                        fechalta,
                        nrosolicitud,
                        totalapagar,
                        porcentajepagado,
                        observacion,
                        estado
                    };

                    solicitudesToInsert.push(solicitud);
                    count++;
                }
            }
        }

        console.log(`Found ${count} solicitudes in SQL dump.`);

        // Validation
        console.log('Fetching existing IDs for FK validation...');
        // We need to fetch ALL to be safe, or in chunks if too many. 
        // Assuming < 10000 for now based on file analysis.
        const { data: clientes } = await supabase.from('cliente').select('idcliente');
        const { data: productos } = await supabase.from('producto').select('idproducto');

        // We might also need vendedores but skipping for now or assume they exist?
        // Let's assume we need to check if relavendedor exists?
        // User migrated Vendedores earlier.
        const { data: vendedores } = await supabase.from('vendedor').select('idvendedor');

        const clienteIds = new Set(clientes?.map(c => c.idcliente));
        const productoIds = new Set(productos?.map(p => p.idproducto));
        const vendedorIds = new Set(vendedores?.map(v => v.idvendedor));

        const validSolicitudes = solicitudesToInsert.filter(s => {
            const hasCliente = clienteIds.has(s.relacliente);
            const hasProducto = productoIds.has(s.relaproducto);
            const hasVendedor = vendedorIds.has(s.relavendedor); // Vendedor might be optional? Table says NOT NULL.

            if (!hasCliente) return false;
            if (!hasProducto) {
                console.warn(`Skipping solicitud ${s.idsolicitud}: Producto ${s.relaproducto} not found.`);
                return false;
            }
            if (!hasVendedor) {
                console.warn(`Skipping solicitud ${s.idsolicitud}: Vendedor ${s.relavendedor} not found.`);
                return false;
            }
            return true;
        });

        console.log(`Filtered ${solicitudesToInsert.length - validSolicitudes.length} solicitudes due to missing FKs.`);
        console.log(`Proceeding with ${validSolicitudes.length} valid solicitudes.`);


        if (process.argv.includes('--dry-run')) {
            console.log('Dry run: logging first 5 items');
            console.log(JSON.stringify(validSolicitudes.slice(0, 5), null, 2));
            return;
        }

        // Batch insert
        const BATCH_SIZE = 100;
        for (let i = 0; i < validSolicitudes.length; i += BATCH_SIZE) {
            const batch = validSolicitudes.slice(i, i + BATCH_SIZE);
            const { error } = await supabase
                .from('solicitud')
                .upsert(batch, { onConflict: 'idsolicitud' });

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

migrateSolicitudes();
