import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLAVE = process.env.NEXT_PUBLIC_SUPABASE_KEY;

/** Si no hay base de cuentas configurada, la app funciona abierta como antes. */
export const cuentasActivas = Boolean(URL_SB && CLAVE);

let cliente: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!cliente) cliente = createClient(URL_SB!, CLAVE!, { auth: { persistSession: true, autoRefreshToken: true } });
  return cliente;
}
