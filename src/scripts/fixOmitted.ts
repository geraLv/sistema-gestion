
import fs from 'fs';
// @ts-ignore
import pdfLib from 'pdf-parse';
const { PDFParse } = pdfLib;
import { supabase } from '../db';

const pdfPath = "C:/Users/ING Nordeste/Desktop/repos/sistema-gestion/sistema-migrado/Reporte de Solicitudes CREDITO GESTION.pdf";
const PRODUCT_MAP: Record<string, number> = { 'Usado': 4, '0 Km': 5, 'Moto': 6, '0Km': 5, 'Nuevo': 5 };
const DEFAULT_LOCALIDAD = 5;
const VENDEDOR_DEFAULT = 8;
const MAX_SAFE_VALUE = 999_999_999;

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fixOmitted() {
    console.log("🔧 Solucionando solicitudes omitidas por cliente no encontrado...\n");

    // 1. Load existing clients map
    let allClients: any[] = [];
    let page = 0;
    while (true) {
        const { data } = await supabase.from('cliente').select('idcliente, dni, appynom').range(page * 1000, (page + 1) * 1000 - 1);
        if (!data || data.length === 0) break;
        allClients = allClients.concat(data);
        if (data.length < 1000) break;
        page++;
    }
    const clientMap = new Map<string, number>(); // dniClean -> idcliente
    const clientNameMap = new Map<string, number>(); // normalizedName -> idcliente
    allClients.forEach(c => {
        const clean = String(c.dni).replace(/\D/g, '');
        if (clean) {
            clientMap.set(clean, c.idcliente);
            if (clean.startsWith('0')) clientMap.set(clean.substring(1), c.idcliente);
            else if (clean.length === 7) clientMap.set('0' + clean, c.idcliente);
        }
        const normName = c.appynom.trim().toUpperCase().replace(/\s+/g, ' ');
        clientNameMap.set(normName, c.idcliente);
    });

    // 2. Load existing solicitudes
    let existingPageS = 0;
    const existingNros = new Set<string>();
    while (true) {
        const { data } = await supabase.from('solicitud').select('nrosolicitud').range(existingPageS * 1000, (existingPageS + 1) * 1000 - 1);
        if (!data || data.length === 0) break;
        data.forEach(s => existingNros.add(String(s.nrosolicitud)));
        if (data.length < 1000) break;
        existingPageS++;
    }
    console.log(`📋 ${existingNros.size} solicitudes ya en BD.`);
    console.log(`👥 ${allClients.length} clientes en BD.\n`);

    // 3. Parse PDF and process ONLY the ones that were omitted (client not found by DNI)
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    const fullText = pdfData.text.replace(/\r?\n/g, ' ');
    const rowRegex = /(\d+)\s+([A-Z\s\.]+?)\s+((?:\d{1,2}\.)?\d{3}(?:\.\d{3})?|\d{7,8})\s+(Usado|0 Km|Moto|0Km)\s+\$([\d\.]+)\s+(\d+)\s+\$([\d\.]+)/g;

    let fixed = 0, stillMissing = 0, alreadyExists = 0;
    let match;

    while ((match = rowRegex.exec(fullText)) !== null) {
        const nroSolicitud = match[1].trim();
        const nameRaw = match[2].trim().toUpperCase().replace(/\s+/g, ' ');
        const dniRaw = match[3].trim();
        const productoRaw = match[4].trim();
        const montoCuotaRaw = match[5].replace(/\./g, '');
        const cantCuotasRaw = match[6].trim();
        const totalPagadoRaw = match[7].replace(/\./g, '');
        const dniClean = dniRaw.replace(/\D/g, '');

        // Only process rows where the client was NOT found by DNI
        const idClienteByDni = clientMap.get(dniClean);
        if (idClienteByDni) continue; // Already handled in previous import run

        const idProducto = PRODUCT_MAP[productoRaw];
        if (!idProducto) continue;

        const montoCuota = parseInt(montoCuotaRaw) || 0;
        const cantCuotas = parseInt(cantCuotasRaw) || 0;
        const totalPagado = parseInt(totalPagadoRaw) || 0;
        const totalApagar = montoCuota * cantCuotas;
        if (montoCuota > MAX_SAFE_VALUE || totalPagado > MAX_SAFE_VALUE || totalApagar > MAX_SAFE_VALUE) continue;
        const porcentajePagado = totalApagar > 0 ? Math.round((totalPagado * 100 / totalApagar) * 100) / 100 : 0;

        // Skip if solicitud already exists
        if (existingNros.has(nroSolicitud)) { alreadyExists++; continue; }

        // Try to find client by name (exact normalized)
        let idCliente = clientNameMap.get(nameRaw);

        if (!idCliente) {
            // Create the missing client now
            console.log(`➕ Creando cliente: "${nameRaw}" (DNI: ${dniRaw})`);
            const { data: newClient, error: createErr } = await supabase
                .from('cliente')
                .insert({
                    appynom: nameRaw,
                    dni: dniRaw,
                    direccion: 'Sin datos',
                    telefono: 'Sin datos',
                    relalocalidad: DEFAULT_LOCALIDAD,
                    condicion: 1,
                    fechalta: new Date().toISOString()
                })
                .select('idcliente')
                .single();

            if (createErr || !newClient) {
                // Maybe DNI unique constraint — try to find by DNI again after refresh
                console.warn(`  ⚠️ No se pudo crear: ${createErr?.message}. Intentando buscar por DNI...`);
                const { data: found } = await supabase.from('cliente').select('idcliente').eq('dni', dniRaw).single();
                if (found) {
                    idCliente = found.idcliente;
                } else {
                    stillMissing++;
                    continue;
                }
            } else {
                idCliente = newClient.idcliente as number;
                clientMap.set(dniClean, idCliente as number);
                clientNameMap.set(nameRaw, idCliente as number);
            }
        }

        // Insert solicitud
        const { error: insertErr } = await supabase.from('solicitud').insert({
            nrosolicitud: nroSolicitud,
            relacliente: idCliente,
            relaproducto: idProducto,
            relavendedor: VENDEDOR_DEFAULT,
            monto: totalApagar,
            cantidadcuotas: cantCuotas,
            totalabonado: totalPagado,
            totalapagar: totalApagar,
            porcentajepagado: porcentajePagado,
            estado: 1,
            fechalta: new Date().toISOString()
        });

        if (insertErr) {
            console.error(`❌ Error insertando Solicitud ${nroSolicitud}: ${insertErr.message}`);
            stillMissing++;
        } else {
            console.log(`✨ Solicitud ${nroSolicitud} creada para "${nameRaw}"`);
            existingNros.add(nroSolicitud);
            fixed++;
        }

        await sleep(50); // small pause to avoid rate limiting
    }

    console.log("\n─────────────────────────────────────────");
    console.log(`✅ Solicitudes creadas:           ${fixed}`);
    console.log(`⚠️  Ya existían (se saltaron):    ${alreadyExists}`);
    console.log(`❌ Aún sin resolver:              ${stillMissing}`);
}

fixOmitted().catch(err => console.error("Error fatal:", err.message));
