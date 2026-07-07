import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn("Supabase: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no están definidas. Verifica tu .env.local");
}

export const supabase = createClient(url, key);
