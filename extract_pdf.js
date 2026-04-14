const fs = require('fs');
const pdf = require('pdf-parse');
let dataBuffer = fs.readFileSync('C:\\Users\\ING Nordeste\\Desktop\\repos\\sistema-gestion\\sistema-migrado\\NUEVO CONTRATO CREDITO GESTION.pdf');
const { PDFParse } = pdf;
const parser = new PDFParse();
parser.parseBuffer(dataBuffer).then(data => console.log(data.text)).catch(e => console.log(Object.keys(parser)));
