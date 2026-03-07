const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function search() {
    const csvPath = path.join(__dirname, '../DOC PROGRAMADOR.csv');
    const fileStream = fs.createReadStream(csvPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineNumber = 0;
    for await (const line of rl) {
        lineNumber++;
        if (line.includes('1893')) {
            console.log(`Line ${lineNumber}: ${line}`);
        }
    }
}
search();
