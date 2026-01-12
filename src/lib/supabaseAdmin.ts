import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY - This is needed for server-side admin operations. Get it from Supabase Dashboard → Settings → API → service_role key");
  }
  
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(url!, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  
  return _supabaseAdmin;
}

// Export as a lazy-loaded client
export const supabaseAdmin = getSupabaseAdmin();