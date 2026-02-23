
import fs from 'fs';
// @ts-ignore
import pdfLib from 'pdf-parse';
const { PDFParse } = pdfLib;
import { supabase } from '../db';

const pdfPath = "C:/Users/ING Nordeste/Desktop/repos/sistema-gestion/sistema-migrado/Reporte de Solicitudes CREDITO GESTION.pdf";

async function checkPdfNames() {
    console.log("🔍 Verificando si los nombres del PDF existen en la BD...\n");

    // 1. Cargar todos los clientes en memoria (nombre normalizado -> id)
    const allClients: any[] = [];
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
    console.log(`✅ Cargados ${allClients.length} clientes desde la BD.\n`);

    // Mapa: nombre normalizado -> cliente
    const clientMap = new Map<string, any>();
    allClients.forEach(c => {
        const norm = c.appynom.trim().toUpperCase().replace(/\s+/g, ' ');
        clientMap.set(norm, c);
    });

    // 2. Parsear PDF
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    const fullText = pdfData.text.replace(/\r?\n/g, ' ');

    // 3. Extraer filas del PDF
    const rowRegex = /(\d+)\s+([A-Z\s\.]+?)\s+((?:\d{1,2}\.)?\d{3}(?:\.\d{3})?|\d{7,8})\s+(Usado|0 Km|Moto|0Km)\s+\$([\d\.]+)\s+(\d+)\s+\$([\d\.]+)/g;

    let match;
    const found: string[] = [];
    const notFound: string[] = [];
    const seen = new Set<string>();

    while ((match = rowRegex.exec(fullText)) !== null) {
        const nro = match[1].trim();
        const name = match[2].trim().toUpperCase().replace(/\s+/g, ' ');
        const dni = match[3].trim();

        if (seen.has(name)) continue;
        seen.add(name);

        // Exact match
        if (clientMap.has(name)) {
            found.push(`  ✅ [${nro}] ${name} (BD: ${clientMap.get(name)?.appynom})`);
            continue;
        }

        // Partial match: check if any DB name contains ALL words of the PDF name
        const pdfWords = name.split(' ').filter(w => w.length > 2);
        const partialMatch = allClients.find(c => {
            const dbName = c.appynom.trim().toUpperCase();
            return pdfWords.every(w => dbName.includes(w));
        });

        if (partialMatch) {
            found.push(`  ⚠️  [${nro}] PDF: "${name}" -> BD: "${partialMatch.appynom.trim()}" (posible coincidencia parcial)`);
        } else {
            notFound.push(`  ❌ [${nro}] "${name}" (DNI: ${dni})`);
        }
    }

    console.log(`=== ENCONTRADOS EN BD: ${found.length} ===`);
    found.forEach(l => console.log(l));

    console.log(`\n=== NO ENCONTRADOS EN BD: ${notFound.length} ===`);
    notFound.forEach(l => console.log(l));

    console.log(`\n─────────────────────────────`);
    console.log(`Total únicos en PDF: ${found.length + notFound.length}`);
    console.log(`Encontrados: ${found.length}`);
    console.log(`No encontrados: ${notFound.length}`);
}

checkPdfNames();
