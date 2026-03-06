import fs from "fs";
import readline from "readline";

async function verifyCsv() {
    const filePath = "c:/Users/ING Nordeste/Desktop/repos/sistema-gestion/sistema-migrado/sistema/migrations/cliente.csv";

    if (!fs.existsSync(filePath)) {
        console.error("File not found:", filePath);
        return;
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    let totalRows = 0;
    let headers: string[] = [];
    let relalocalidadIndex = -1;
    let isComma = false;

    for await (const line of rl) {
        totalRows++;

        // First line determines separator
        if (totalRows === 1) {
            if (line.includes(";")) {
                headers = line.split(";").map(h => h.trim().replace(/^"|"$/g, ""));
            } else {
                isComma = true;
                headers = line.split(",").map(h => h.trim().replace(/^"|"$/g, ""));
            }
            relalocalidadIndex = headers.indexOf("relalocalidad");
            if (relalocalidadIndex === -1) {
                // Sometimes it might be uppercase or slightly different
                relalocalidadIndex = headers.findIndex(h => h.toLowerCase() === "relalocalidad");
            }
            console.log("Headers detected:", headers);
            console.log("relalocalidad index:", relalocalidadIndex);
            continue;
        }

        if (relalocalidadIndex !== -1) {
            const cols = isComma ? line.split(",") : line.split(";");
            const val = cols[relalocalidadIndex]?.trim().replace(/^"|"$/g, "");

            if (val === "32") {
                count++;
            }
        }
    }

    console.log(`Total rows in CSV: ${totalRows}`);
    console.log(`Clients with relalocalidad = 32: ${count}`);
}

verifyCsv();
