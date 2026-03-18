import { supabase } from '../src/db';

async function backfill(dryRun = false) {
  console.log(`Iniciando backfill (Dry Run: ${dryRun})...`);
  
  // 1. Fetch all paid cuotas without idusuariocobro using pagination
  console.log("Obteniendo cuotas pagadas sin cobrador...");
  let allCuotas: any[] = [];
  let fetchMore = true;
  let page = 0;
  const pageSize = 1000;

  while(fetchMore) {
    const { data, error } = await supabase
      .from('cuotas')
      .select('idcuota')
      .eq('estado', 2)
      .is('idusuariocobro', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
       console.error("Error fetching cuotas:", error);
       return;
    }
    
    if (data && data.length > 0) {
      allCuotas = allCuotas.concat(data);
      page++;
    } else {
      fetchMore = false;
    }
  }

  console.log(`Encontradas ${allCuotas.length} cuotas pagadas sin idusuariocobro.`);
  if (allCuotas.length === 0) return;

  // 2. Fetch all audit logs for cuotas update paginated
  console.log("Obteniendo logs de auditoría...");
  let allLogs: any[] = [];
  fetchMore = true;
  page = 0;

  while(fetchMore) {
    const { data, error } = await supabase
      .from('audit_log')
      .select('actor_user_id, entity_id')
      .eq('entity', 'cuotas')
      .eq('action', 'UPDATE')
      .not('actor_user_id', 'is', null)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
       console.error("Error fetching logs:", error);
       return;
    }
    
    if (data && data.length > 0) {
      allLogs = allLogs.concat(data);
      console.log(`Descargados ${allLogs.length} logs...`);
      page++;
    } else {
      fetchMore = false;
    }
  }

  console.log(`Total de logs de actualización de cuotas: ${allLogs.length}.`);

  let updateErrors = 0;
  const cuotasToUpdate = new Map<number, number>(); // idcuota -> iduser
  const cuotaSet = new Set(allCuotas.map(c => c.idcuota));

  for (const log of allLogs) {
    if (!log.entity_id || !log.actor_user_id) continue;

    const ids = String(log.entity_id).split(',').map(s => parseInt(s.trim()));
    
    for (const id of ids) {
      if (!isNaN(id) && cuotaSet.has(id) && !cuotasToUpdate.has(id)) {
        cuotasToUpdate.set(id, log.actor_user_id);
      }
    }
  }

  console.log(`Se recuperaron los usuarios para ${cuotasToUpdate.size} cuotas de las ${allCuotas.length} pendientes.`);

  if (!dryRun) {
    console.log("Iniciando actualización en base de datos. Esto puede tardar unos minutos...");
    let processed = 0;
    
    for (const [idcuota, iduser] of cuotasToUpdate.entries()) {
      const { error } = await supabase
        .from('cuotas')
        .update({ idusuariocobro: iduser })
        .eq('idcuota', idcuota);
        
      if (error) {
        console.error(`Error actualizando cuota ${idcuota}:`, error);
        updateErrors++;
      }
      processed++;
      if (processed % 50 === 0) {
        console.log(`Completado: ${processed}/${cuotasToUpdate.size}`);
      }
    }
    console.log(`\n¡Actualización completada!`);
    console.log(`- Cuotas actualizadas correctamente: ${processed - updateErrors}`);
    console.log(`- Errores de actualización: ${updateErrors}`);
  }
}

backfill(false);
