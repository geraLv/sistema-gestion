import { supabase } from '../src/db';

async function run() {
  const { data, error } = await supabase
    .from('audit_log')
    .select('id, actor_user_id, entity_id, action, entity')
    .eq('entity', 'cuotas')
    .eq('action', 'UPDATE')
    .not('actor_user_id', 'is', null)
    .limit(10);
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
