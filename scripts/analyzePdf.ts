import fs from 'fs';
import path from 'path';
const pdf = require('pdf-parse');

async function analyzePdf() {
    const pdfPath = path.resolve(__dirname, '../../Reporte de Solicitudes CREDITO GESTION.pdf');
    console.log(`Reading PDF from: ${pdfPath}`);
    console.log('PDF Library Type:', typeof pdf);
    console.log('PDF Library Keys:', Object.keys(pdf));

    try {
        const dataBuffer = fs.readFileSync(pdfPath);

        // Check if pdf is a function, otherwise try default
        let parseFunc = pdf;
        if (typeof pdf !== 'function' && typeof pdf.default === 'function') {
            parseFunc = pdf.default;
            console.log('Using pdf.default');
        }

        if (typeof parseFunc === 'function') {
            const data = await parseFunc(dataBuffer);
            console.log('PDF Info:', data.info);
            console.log('PDF Pages:', data.numpages);
            console.log('--- Text Content Start ---');
            console.log(data.text.substring(0, 5000));
            console.log('--- Text Content End ---');
        } else {
            console.error('pdf-parse is not a function');
        }

    } catch (err) {
        console.error('Error analyzing PDF:', err);
    }
}

analyzePdf();
