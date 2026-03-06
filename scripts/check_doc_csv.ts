import fs from "fs";
import readline from "readline";

async function verifyDocProgramadorCsv() {
    const filePath = "c:/Users/ING Nordeste/Desktop/repos/sistema-gestion/sistema-migrado/DOC PROGRAMADOR.csv";

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let parsingClientes = false;
    let count32 = 0;
    let countAll = 0;

    for await (const line of rl) {
        if (line.includes('"idcliente,""relalocalidad"",""appynom""')) {
            parsingClientes = true;
            continue;
        }

        // Stop parsing if we reach a new block not looking like a client record string
        // A typical line starts with "1,""32"",""GONZALEZ...
        // Or "idcuota,""nrocuota""...
        if (parsingClientes && line.startsWith('"id') && !line.includes('""') && !line.includes('"idcliente')) {
            parsingClientes = false;
        }

        if (parsingClientes) {
            let cols = line.split(",");
            if (cols.length >= 2) {
                let loc = cols[1]?.replace(/["']/g, "").trim();
                if (loc === "32") {
                    count32++;
                }
                countAll++;
            }
        }
    }

    console.log(`Total "cliente" rows in DOC PROGRAMADOR.csv: ${countAll}`);
    console.log(`Matched locality 32: ${count32}`);
}

verifyDocProgramadorCsv();
