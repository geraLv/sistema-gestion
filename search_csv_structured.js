const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function search() {
    const csvPath = path.join(__dirname, '../DOC PROGRAMADOR.csv');
    const fileStream = fs.createReadStream(csvPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let cuotas = [];
    let solicitud = null;

    for await (const line of rl) {
        if (line.startsWith('"1893,"')) {
            solicitud = line;
        } else if (line.includes(',""1893"",')) {
            cuotas.push(line);
        }
    }

    console.log("--- SOLICITUD EN CSV ---");
    console.log(solicitud);
    console.log(`\n--- CUOTAS EN CSV PARA SOLICITUD 1893 (${cuotas.length} encontradas) ---`);
    cuotas.forEach(c => console.log(c));
}
search();
