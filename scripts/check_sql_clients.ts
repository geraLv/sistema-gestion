import fs from "fs";

async function auditMigration() {
    const sqlPath = "c:/Users/ING Nordeste/Desktop/repos/sistema-gestion/sistema-migrado/gestion.sql";
    if (!fs.existsSync(sqlPath)) {
        console.log("gestion.sql not found!");
        return;
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    const insertBlockRegex = /INSERT INTO `cliente` [^;]+;/;
    const match = sqlContent.match(insertBlockRegex);

    if (!match) {
        console.log("No insert block in gestion.sql");
        return;
    }

    const insertStatement = match[0];
    const valuesStartTime = insertStatement.indexOf('VALUES') + 6;
    const valuesPart = insertStatement.substring(valuesStartTime).trim();

    const rowRegex = /\((?:[^)(]+|'[^']*')+\)/g;
    const rows: string[] = [];
    let matchRow;

    while ((matchRow = rowRegex.exec(valuesPart)) !== null) {
        rows.push(matchRow[0].slice(1, -1));
    }

    console.log(`Total rows in gestion.sql 'cliente' insert block: ${rows.length}`);
}

auditMigration();
