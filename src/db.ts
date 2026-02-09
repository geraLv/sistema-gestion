import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.SUPABASE_URL || "";
const key = process.env.SUPABASE_KEY || "";

if (!url || !key) {
  console.warn("SUPABASE_URL or SUPABASE_KEY not set. See .env.example");
}

export const supabase = createClient(url, key);
