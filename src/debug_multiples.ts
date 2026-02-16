
import { ReporteRepository } from "./repositories/reporteRepository";

async function checkMultiples() {
    const idcuotas = [201];
    console.log(`Checking multiples for ${idcuotas}...`);

    try {
        const results = await ReporteRepository.getRecibosMultiplesData(idcuotas);
        console.log("Results count:", results.length);
        if (results.length === 0) {
            console.log("No results returned.");
        } else {
            console.log("First result:", JSON.stringify(results[0], null, 2));
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

checkMultiples();
