import { supabase } from '../db';

async function checkCuotasSchema() {
    const { data, error } = await supabase.from('cuotas').select('*').limit(1);
    if (error) {
        console.error("Error fetching cuotas:", error);
        return;
    }
    if (data && data.length > 0) {
        console.log("Columns in cuotas table:");
        console.log(Object.keys(data[0]));
    } else {
        console.log("No data found in cuotas table to infer columns.");
    }
}

checkCuotasSchema().catch(console.error);
