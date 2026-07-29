import { createClient } from "@supabase/supabase-js";

export function createServerSupabaseClient(env: CloudflareEnv) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
}
