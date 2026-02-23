
import fs from 'fs';
// @ts-ignore
import pdfLib from 'pdf-parse';
const { PDFParse } = pdfLib;

const pdfPath = "C:/Users/ING Nordeste/Desktop/repos/sistema-gestion/sistema-migrado/Reporte de Solicitudes CREDITO GESTION.pdf";

// Target solicitudes with numeric overflow
const TARGET_NROS = ['736', '494'];

async function diagnose() {
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    const fullText = pdfData.text.replace(/\r?\n/g, ' ');

    const rowRegex = /(\d+)\s+([A-Z\s\.]+?)\s+((?:\d{1,2}\.)?\d{3}(?:\.\d{3})?|\d{7,8})\s+(Usado|0 Km|Moto|0Km)\s+\$([\d\.]+)\s+(\d+)\s+\$([\d\.]+)/g;

    let match;
    while ((match = rowRegex.exec(fullText)) !== null) {
        const nro = match[1].trim();
        if (!TARGET_NROS.includes(nro)) continue;

        const name = match[2].trim();
        const dni = match[3].trim();
        const product = match[4].trim();
        const cuotaRaw = match[5];
        const cantRaw = match[6];
        const pagadoRaw = match[7];

        const cuota = parseInt(cuotaRaw.replace(/\./g, ''));
        const cant = parseInt(cantRaw);
        const pagado = parseInt(pagadoRaw.replace(/\./g, ''));
        const total = cuota * cant;

        console.log(`\n=== Solicitud ${nro} ===`);
        console.log(`Cliente:          ${name}`);
        console.log(`DNI:              ${dni}`);
        console.log(`Producto:         ${product}`);
        console.log(`Cuota RAW:        ${cuotaRaw}  → parsed: ${cuota}`);
        console.log(`Cant cuotas RAW:  ${cantRaw}  → parsed: ${cant}`);
        console.log(`Total pagado RAW: ${pagadoRaw}  → parsed: ${pagado}`);
        console.log(`Total a pagar:    ${cuota} x ${cant} = ${total}`);
        console.log(`>> ${total > 2147483647 ? '❌ INTEGER OVERFLOW (> 2.1B)' : '✅ OK'}`);
    }
}

diagnose();
