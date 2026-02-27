import { supabase } from '../db';

async function checkDuplicates() {
    console.log("🔍 Analizando duplicados en la base de datos...\n");

    // 1. Clientes (por DNI)
    let clientes: any[] = [];
    let pageC = 0;
    while (true) {
        const { data, error } = await supabase.from('cliente').select('idcliente, dni, appynom').range(pageC * 1000, (pageC + 1) * 1000 - 1);
        if (error) { console.error("Error obteniendo clientes:", error); return; }
        if (!data || data.length === 0) break;
        clientes = clientes.concat(data);
        if (data.length < 1000) break;
        pageC++;
    }

    const dniCount = new Map<string, any[]>();
    for (const c of clientes) {
        // Normalizar DNI igual que en la migración
        if (!c.dni) continue;
        const clean = String(c.dni).replace(/[\.\s-]/g, "").trim();
        if (!clean) continue;

        if (!dniCount.has(clean)) {
            dniCount.set(clean, []);
        }
        dniCount.get(clean)!.push(c);
    }

    let dupClientes = 0;
    console.log("👥 CLIENTES DUPLICADOS (por DNI):");
    for (const [dni, list] of dniCount.entries()) {
        if (list.length > 1) {
            dupClientes++;
            if (dupClientes <= 5) {
                console.log(`  - DNI: ${dni} tiene ${list.length} registros: IDs [${list.map(l => l.idcliente).join(', ')}]`);
            }
        }
    }
    console.log(`  Total de DNIs con múltiples registros: ${dupClientes} (de ${clientes.length} clientes totales)\n`);

    // 2. Solicitudes (por nrosolicitud)
    let solicitudes: any[] = [];
    let pageS = 0;
    while (true) {
        const { data, error } = await supabase.from('solicitud').select('idsolicitud, nrosolicitud, relacliente, fechalta').range(pageS * 1000, (pageS + 1) * 1000 - 1);
        if (error) { console.error("Error obteniendo solicitudes:", error); return; }
        if (!data || data.length === 0) break;
        solicitudes = solicitudes.concat(data);
        if (data.length < 1000) break;
        pageS++;
    }

    const nroCount = new Map<string, any[]>();
    for (const s of solicitudes) {
        const clean = String(s.nrosolicitud || "").trim();
        if (!clean || clean === "0" || clean === "" || clean === "null") continue;

        if (!nroCount.has(clean)) {
            nroCount.set(clean, []);
        }
        nroCount.get(clean)!.push(s);
    }

    let dupSolicitudes = 0;
    console.log("📄 SOLICITUDES DUPLICADAS (por número de solicitud):");
    for (const [nro, list] of nroCount.entries()) {
        if (list.length > 1) {
            dupSolicitudes++;
            if (dupSolicitudes <= 5) {
                console.log(`  - Nro Solicitud: ${nro} tiene ${list.length} registros: IDs [${list.map(l => l.idsolicitud).join(', ')}]`);
            }
        }
    }
    console.log(`  Total de Nros de Solicitud con múltiples registros: ${dupSolicitudes} (de ${solicitudes.length} solicitudes totales)\n`);

}

checkDuplicates().catch(console.error);
