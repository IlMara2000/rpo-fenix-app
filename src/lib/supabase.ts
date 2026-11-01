import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Header Authorization per le API protette.
 * Fallisce subito, invece di lasciare che il server risponda 401.
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const session = supabase ? await supabase.auth.getSession() : null;
  const token = session?.data.session?.access_token;
  if (!token) {
    throw new Error("Sessione scaduta: accedi di nuovo per usare questo strumento.");
  }
  return { Authorization: `Bearer ${token}` };
}
