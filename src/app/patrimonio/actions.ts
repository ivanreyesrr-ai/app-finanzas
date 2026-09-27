"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";
import { isISODate } from "@/lib/validate-movement";

export type ActualizarState = { error: string } | null;

// "1.234,56", "1234.56" o "0" → número >= 0. null si no es válido.
function parseBalance(input: string): number | null {
  let s = input.replace(/[\s€$]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Number(s);
}

export async function saveSnapshot(
  _prev: ActualizarState,
  formData: FormData,
): Promise<ActualizarState> {
  const accountId = String(formData.get("account_id") ?? "");
  const balance = parseBalance(String(formData.get("balance") ?? ""));
  const date = String(formData.get("date") ?? "");
  const fxRaw = Number(formData.get("fx_rate"));

  if (balance === null) return { error: "Poné un saldo válido (ej. 23.807,19)." };
  if (!isISODate(date)) return { error: "Fecha no válida." };
  if (date > todayISO()) return { error: "La fecha no puede ser futura." };

  const supabase = await createClient();
  const { data: account } = await supabase
    .from("accounts")
    .select("id, currency, is_daily")
    .eq("id", accountId)
    .maybeSingle();
  if (!account) return { error: "Elegí una cuenta." };
  if (account.is_daily)
    return { error: "La cuenta del día a día se calcula con los movimientos." };

  const fx_rate = account.currency === "USD" && fxRaw > 0 ? fxRaw : null;

  // Un saldo por cuenta y día: si ya había uno ese día, se reemplaza.
  const { error } = await supabase
    .from("balance_snapshots")
    .upsert(
      { account_id: accountId, date, balance, fx_rate },
      { onConflict: "account_id,date" },
    );
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  redirect("/patrimonio");
}
