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
    let currentLine = 0;

    for await (const line of rl) {
        currentLine++;

        // User said clients start at line 2 and end around 1783.
        if (currentLine >= 2 && currentLine <= 1783) {
            parsingClientes = true;
        } else {
            parsingClientes = false;
        }

        if (parsingClientes) {
            let cols = line.split("\",\"");
            // "1,""32"",""GONZALEZ MARINA "",""18.077.359"",""BARRIO ALBERDI "",""370-5001058"",""0"",""0000-00-00 00:00:00"""
            // It has internal double quotes as ""

            let splitcols = line.split(",");
            if (splitcols.length >= 5) {
                let loc = splitcols[1]?.replace(/["']/g, "").trim();
                if (loc === "32") {
                    count32++;
                    console.log(line);
                }
                countAll++;
            }
        }

        if (currentLine > 1785) break;
    }

    console.log(`Total "cliente" rows parsed: ${countAll}`);
    console.log(`Matched locality 32: ${count32}`);
}

verifyDocProgramadorCsv();
