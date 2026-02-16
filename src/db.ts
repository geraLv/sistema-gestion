import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`[DB Debug] Init Supabase Client`);
console.log(`[DB Debug] URL present: ${!!url}, Length: ${url?.length}`);
console.log(`[DB Debug] Key present: ${!!key}, Length: ${key?.length}`);

if (!url || !key) {
  console.error(
    "❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in process.env",
  );
  // No lanzar error aquí para permitir que el script de diagnóstico corra
  // pero fallará si se intenta usar 'supabase'
}

export const supabase = createClient(url || "https://placeholder.supabase.co", key || "placeholder");
