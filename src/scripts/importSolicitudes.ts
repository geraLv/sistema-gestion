
import fs from 'fs';
// @ts-ignore
import pdfLib from 'pdf-parse';
const { PDFParse } = pdfLib;
import { supabase } from '../db';

const pdfPath = "C:/Users/ING Nordeste/Desktop/repos/sistema-gestion/sistema-migrado/Reporte de Solicitudes CREDITO GESTION.pdf";

const PRODUCT_MAP: Record<string, number> = {
    'Usado': 4, '0 Km': 5, 'Moto': 6, '0Km': 5, 'Nuevo': 5
};
const MAX_SAFE_VALUE = 999_999_999;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

async function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

async function retryOperation<T>(fn: () => Promise<T>, label: string): Promise<T | null> {
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            if (attempt < RETRY_ATTEMPTS) {
                console.warn(`  🔄 Retry ${attempt}/${RETRY_ATTEMPTS - 1} para ${label}...`);
                await sleep(RETRY_DELAY_MS * attempt);
            } else {
                console.error(`❌ Fallo definitivo en ${label}: ${err.message}`);
                return null;
            }
        }
    }
    return null;
}

async function parseAndImport() {
    console.log("🚀 Iniciando importación de solicitudes (con retry)...");

    // 1. Load all clients into memory map
    console.log("📊 Cargando clientes...");
    let allClients: any[] = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('cliente').select('idcliente, dni').range(page * 1000, (page + 1) * 1000 - 1);
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        allClients = allClients.concat(data);
        if (data.length < 1000) break;
        page++;
    }
    console.log(`✅ ${allClients.length} clientes cargados.`);

    const clientMap = new Map<string, number>();
    allClients.forEach(c => {
        const clean = String(c.dni).replace(/\D/g, '');
        if (clean) {
            clientMap.set(clean, c.idcliente);
            if (clean.startsWith('0')) clientMap.set(clean.substring(1), c.idcliente);
            else if (clean.length === 7) clientMap.set('0' + clean, c.idcliente);
        }
    });

    // 2. Load all existing solicitudes (to skip them)
    console.log("📋 Cargando solicitudes existentes...");
    let existingPage = 0;
    const existingNros = new Set<string>();
    while (true) {
        const { data } = await supabase.from('solicitud').select('nrosolicitud').range(existingPage * 1000, (existingPage + 1) * 1000 - 1);
        if (!data || data.length === 0) break;
        data.forEach(s => existingNros.add(String(s.nrosolicitud)));
        if (data.length < 1000) break;
        existingPage++;
    }
    console.log(`✅ ${existingNros.size} solicitudes ya existen en BD (se actualizarán si cambiaron).\n`);

    // 3. Parse PDF
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    if (!pdfData?.text) throw new Error("No se pudo extraer texto del PDF");

    const fullText = pdfData.text.replace(/\r?\n/g, ' ');
    const rowRegex = /(\d+)\s+([A-Z\s\.]+?)\s+((?:\d{1,2}\.)?\d{3}(?:\.\d{3})?|\d{7,8})\s+(Usado|0 Km|Moto|0Km)\s+\$([\d\.]+)\s+(\d+)\s+\$([\d\.]+)/g;

    let count = 0, successCount = 0, skipCount = 0, overflowCount = 0, errorCount = 0;
    let match;

    while ((match = rowRegex.exec(fullText)) !== null) {
        count++;
        const nroSolicitud = match[1].trim();
        const dniRaw = match[3].trim();
        const productoRaw = match[4].trim();
        const montoCuotaRaw = match[5].replace(/\./g, '');
        const cantCuotasRaw = match[6].trim();
        const totalPagadoRaw = match[7].replace(/\./g, '');
        const dniClean = dniRaw.replace(/\D/g, '');

        const idProducto = PRODUCT_MAP[productoRaw];
        if (!idProducto) { errorCount++; continue; }

        const montoCuota = parseInt(montoCuotaRaw) || 0;
        const cantCuotas = parseInt(cantCuotasRaw) || 0;
        const totalPagado = parseInt(totalPagadoRaw) || 0;
        const totalApagar = montoCuota * cantCuotas;

        // Safety check for overflow
        if (montoCuota > MAX_SAFE_VALUE || totalPagado > MAX_SAFE_VALUE || totalApagar > MAX_SAFE_VALUE || totalApagar < 0) {
            console.error(`⚠️ OVERFLOW en Solicitud ${nroSolicitud}: cuota=${match[5]}, cuotas=${match[6]}, pagado=${match[7]}, total=${totalApagar}`);
            overflowCount++;
            continue;
        }

        const porcentajePagado = totalApagar > 0 ? Math.round((totalPagado * 100 / totalApagar) * 100) / 100 : 0;

        const idCliente = clientMap.get(dniClean);
        if (!idCliente) {
            skipCount++;
            continue;
        }

        if (existingNros.has(nroSolicitud)) {
            // UPDATE — retry on network error
            const result = await retryOperation(async () => {
                const { error } = await supabase.from('solicitud').update({
                    relacliente: idCliente,
                    relaproducto: idProducto,
                    totalapagar: totalApagar,
                    cantidadcuotas: cantCuotas,
                    totalabonado: totalPagado,
                    porcentajepagado: porcentajePagado
                }).eq('nrosolicitud', nroSolicitud);
                if (error) throw new Error(error.message);
                return true;
            }, `UPDATE Sol.${nroSolicitud}`);

            if (result) successCount++;
            else errorCount++;
        } else {
            // INSERT new — retry on network error
            const result = await retryOperation(async () => {
                const { error } = await supabase.from('solicitud').insert({
                    nrosolicitud: nroSolicitud,
                    relacliente: idCliente,
                    relaproducto: idProducto,
                    relavendedor: 8,
                    monto: totalApagar,
                    cantidadcuotas: cantCuotas,
                    totalabonado: totalPagado,
                    totalapagar: totalApagar,
                    porcentajepagado: porcentajePagado,
                    estado: 1,
                    fechalta: new Date().toISOString()
                });
                if (error) throw new Error(error.message);
                return true;
            }, `INSERT Sol.${nroSolicitud}`);

            if (result) {
                console.log(`✨ Creada Solicitud ${nroSolicitud}`);
                successCount++;
                existingNros.add(nroSolicitud); // track as inserted
            } else {
                errorCount++;
            }
        }
    }

    console.log("\n─────────────────────────────────────────");
    console.log(`Importación completa.`);
    console.log(`Total en PDF:              ${count}`);
    console.log(`✅ Éxito:                   ${successCount}`);
    console.log(`⚠️  Omitidos (sin cliente):  ${skipCount}`);
    console.log(`🔢 Overflow de datos:        ${overflowCount}`);
    console.log(`❌ Errores:                 ${errorCount}`);
}

parseAndImport().catch(err => console.error("Error fatal:", err.message));
