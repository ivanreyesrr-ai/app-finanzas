import type { SupabaseClient } from "@supabase/supabase-js";
import { todayISO } from "./format";

// Crea en la base los movimientos de recurrentes que falten hasta este mes.
// Idempotente: se puede llamar en cada carga de página.
export async function generarRecurrentes(supabase: SupabaseClient) {
  const { error } = await supabase.rpc("generar_recurrentes", { p_hoy: todayISO() });
  return error;
}
