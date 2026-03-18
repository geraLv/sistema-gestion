import { supabase } from '../src/db';
async function run() {
  const { data, error } = await supabase.from('cuotas').select('*').limit(1);
  if (error) console.error(error);
  if (data && data.length > 0) console.log(Object.keys(data[0]).join(', '));
  else console.log('No data');
}
run();
