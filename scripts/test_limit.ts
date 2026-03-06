import { supabase } from "../src/db";

async function testLimit() {
    try {
        console.log("Fetching up to 5000 cuotas...");

        const query = supabase
            .from("cuotas")
            .select("idcuota")
            .limit(5000);

        const { data, error } = await query;
        console.log("Error:", error);
        console.log("Data count:", data?.length);

        console.log("If this is exactly 1000, then PostgREST is overriding our limit.");
    } catch (e) {
        console.error(e);
    }
}

testLimit();
