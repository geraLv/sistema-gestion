const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function check() {
    const csvPath = path.join(__dirname, '../DOC PROGRAMADOR.csv');
    const fileStream = fs.createReadStream(csvPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let count = 0;
    let matchCount = 0;
    let mismatchCount = 0;

    let tableStart = false;

    for await (const line of rl) {
        if (line.includes('idsolicitud,"relacliente"')) {
            tableStart = true;
            continue;
        }

        if (tableStart) {
            // Check if it's the end of the table
            if (line.startsWith('"idlocalidad,')) {
                break;
            }

            const parts = line.split(',');
            if (parts.length >= 9) {
                const id = parts[0].replace(/"/g, '');
                const nro = parts[8].replace(/"/g, '');

                if (id && nro) {
                    if (id === nro) {
                        matchCount++;
                    } else {
                        mismatchCount++;
                        if (mismatchCount <= 5) {
                            console.log(`Mismatch: ID=${id}, NRO=${nro}`);
                        }
                    }
                    count++;
                }
            }
        }
    }

    console.log(`Total: ${count}, Matches: ${matchCount}, Mismatches: ${mismatchCount}`);
}
check();
