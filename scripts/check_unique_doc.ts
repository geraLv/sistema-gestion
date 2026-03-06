import fs from "fs";
import readline from "readline";

async function analyzeDocProgramadorUniqueClients() {
    const filePath = "c:/Users/ING Nordeste/Desktop/repos/sistema-gestion/sistema-migrado/DOC PROGRAMADOR.csv";

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let parsingClientes = false;
    let uniqueLocality32 = new Set();
    let uniqueAll = new Set();

    for await (const line of rl) {
        if (line.includes('"idcliente,""relalocalidad"",""appynom""')) {
            parsingClientes = true;
            continue;
        }

        // Stop parsing if we reach another table header
        if (parsingClientes && line.startsWith('"id') && !line.includes('""') && !line.includes('"idcliente')) {
            parsingClientes = false;
        }

        if (parsingClientes) {
            let cols = line.split(",");
            if (cols.length >= 2) {
                let id = cols[0]?.replace(/["']/g, "").trim();
                let loc = cols[1]?.replace(/["']/g, "").trim();
                uniqueAll.add(id);

                if (loc === "32") {
                    uniqueLocality32.add(id);
                }
            }
        }
    }

    console.log(`Unique clients in DOC PROGRAMADOR.csv: ${uniqueAll.size}`);
    console.log(`Unique clients matching locality 32: ${uniqueLocality32.size}`);
}

analyzeDocProgramadorUniqueClients();
