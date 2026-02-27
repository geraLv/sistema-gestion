import { supabase } from '../db';

async function cleanupDuplicates() {
    console.log("🧹 Iniciando limpieza masiva de duplicados...\n");

    // ---------------------------------------------------------
    // 1. LIMPIEZA DE CLIENTES (Fusión por DNI)
    // ---------------------------------------------------------
    console.log("👥 1. FUSIONANDO CLIENTES DUPLICADOS");

    // Traer todos los clientes (Paginado)
    let clientes: any[] = [];
    let pageC = 0;
    while (true) {
        const { data, error } = await supabase.from('cliente').select('idcliente, dni, appynom').range(pageC * 1000, (pageC + 1) * 1000 - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        clientes = clientes.concat(data);
        if (data.length < 1000) break;
        pageC++;
    }

    const dniCount = new Map<string, any[]>();
    for (const c of clientes) {
        if (!c.dni) continue;
        const clean = String(c.dni).replace(/[\.\s-]/g, "").trim();
        if (!clean) continue;
        if (!dniCount.has(clean)) dniCount.set(clean, []);
        dniCount.get(clean)!.push(c);
    }

    let clientsMerged = 0;
    let clientsDeleted = 0;

    for (const [dni, list] of dniCount.entries()) {
        if (list.length > 1) {
            // Ordenar por ID ascendente para asumir que el ID más bajo o el CSV migrado es el principal
            list.sort((a, b) => a.idcliente - b.idcliente);
            const principal = list[0];
            const duplicados = list.slice(1);

            for (const dup of duplicados) {
                // Reasignar solicitudes de 'dup' a 'principal'
                const { error: errUpdateSol } = await supabase
                    .from('solicitud')
                    .update({ relacliente: principal.idcliente })
                    .eq('relacliente', dup.idcliente);

                if (errUpdateSol) {
                    console.error(`Error reasignando solicitudes de cliente ${dup.idcliente} a ${principal.idcliente}:`, errUpdateSol);
                    continue; // No borramos el cliente si falló la reasignación
                }

                // Intentar borrar el cliente duplicado
                const { error: errDeleteCli } = await supabase
                    .from('cliente')
                    .delete()
                    .eq('idcliente', dup.idcliente);

                if (errDeleteCli) {
                    // Posibles errores de otras FKs que no sean 'solicitud'
                    console.error(`Error borrando cliente duplicado ${dup.idcliente} (probablemente tenga otras relaciones):`, errDeleteCli.message);
                } else {
                    clientsDeleted++;
                }
            }
            clientsMerged++;
            if (clientsMerged % 100 === 0) console.log(`   Procesados ${clientsMerged} grupos de clientes con múltiples registros...`);
        }
    }
    console.log(`✅ Fusión de clientes completada. Borrados: ${clientsDeleted} clientes sobrantes.\n`);


    // ---------------------------------------------------------
    // 2. LIMPIEZA DE SOLICITUDES DUPLICADAS
    // ---------------------------------------------------------
    console.log("📄 2. ELIMINANDO SOLICITUDES DUPLICADAS (Borrando las generadas por PDF)");

    // Traer todas las solicitudes (Paginado)
    let solicitudes: any[] = [];
    let pageS = 0;
    while (true) {
        const { data, error } = await supabase.from('solicitud').select('idsolicitud, nrosolicitud, fechalta').range(pageS * 1000, (pageS + 1) * 1000 - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        solicitudes = solicitudes.concat(data);
        if (data.length < 1000) break;
        pageS++;
    }

    const nroCount = new Map<string, any[]>();
    for (const s of solicitudes) {
        const clean = String(s.nrosolicitud || "").trim();
        if (!clean || clean === "0" || clean === "" || clean === "null") continue;
        if (!nroCount.has(clean)) nroCount.set(clean, []);
        nroCount.get(clean)!.push(s);
    }

    let solDeleted = 0;
    let cuotasDeleted = 0;
    let processedSolGroups = 0;

    for (const [nro, list] of nroCount.entries()) {
        if (list.length > 1) {
            // Preferimos el que tenga idsolicitud menor, 
            // ya que los que insertó la migración CSV respetaron los IDs originales (ej: ID=1 al 1900 aprox).
            list.sort((a, b) => a.idsolicitud - b.idsolicitud);
            const principal = list[0];
            const duplicados = list.slice(1);

            for (const dup of duplicados) {
                // Borrar las cuotas atadas a la solicitud duplicada primero
                const { data: deletedCuotas, error: errDeleteCuotas } = await supabase
                    .from('cuotas')
                    .delete()
                    .eq('relasolicitud', dup.idsolicitud)
                    .select('idcuota');

                if (errDeleteCuotas) {
                    console.error(`Error borrando cuotas de la solicitud ${dup.idsolicitud}:`, errDeleteCuotas.message);
                    continue;
                }
                if (deletedCuotas) cuotasDeleted += deletedCuotas.length;

                // Borrar la solicitud
                // NOTA: Algunas solicitudes PDF también tenían pagos manuales. Preferimos perder ese pago manual 
                // para mantener el historial intachable de la migración CSV que fue validada.
                const { error: errDeleteSol } = await supabase
                    .from('solicitud')
                    .delete()
                    .eq('idsolicitud', dup.idsolicitud);

                if (errDeleteSol) {
                    console.error(`Error borrando solicitud duplicada ${dup.idsolicitud}:`, errDeleteSol.message);
                } else {
                    solDeleted++;
                }
            }

            processedSolGroups++;
            if (processedSolGroups % 100 === 0) console.log(`   Procesados ${processedSolGroups} grupos de solicitudes duplicadas...`);
        }
    }

    console.log(`✅ Solicitudes duplicadas limpiadas.`);
    console.log(`   - Solicitudes eliminadas (sobrantes PDF): ${solDeleted}`);
    console.log(`   - Cuotas huérfanas eliminadas asociadas a estas solicitudes: ${cuotasDeleted}\n`);

    console.log("🎉 LIMPIEZA COMPLETA FINALIZADA!");
}

cleanupDuplicates().catch(err => console.error("Error fatal:", err.message));
