import { supabase } from "../src/db";

async function testPagination() {
    try {
        console.log("Fetching cuotas with pagination...");

        let allRows: any[] = [];
        let from = 0;
        const step = 1000;

        while (true) {
            const query = supabase
                .from("cuotas")
                .select("idcuota")
                .range(from, from + step - 1);

            const { data, error } = await query;
            if (error) {
                console.error("Error:", error);
                break;
            }

            if (data && data.length > 0) {
                allRows = allRows.concat(data);
                console.log(`Fetched ${data.length} rows, total: ${allRows.length}`);

                if (data.length < step) {
                    break;
                }
                from += step;
            } else {
                break;
            }
        }

        console.log("Final Data count:", allRows.length);
    } catch (e) {
        console.error(e);
    }
}

testPagination();
