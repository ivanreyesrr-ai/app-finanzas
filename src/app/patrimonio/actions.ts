"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseSignedAmount, todayISO } from "@/lib/format";
import type { SaldoRow } from "@/lib/patrimonio";
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

// Saldo inicial de la cuenta diaria a partir de "cuánto tenés hoy":
// saldo inicial = saldo de hoy − lo que ya está cargado hasta hoy, fechado antes
// del primer movimiento y antes de este mes (así cuenta como "saldo del mes anterior").
export async function saveSaldoInicial(
  _prev: ActualizarState,
  formData: FormData,
): Promise<ActualizarState> {
  const raw = String(formData.get("balance") ?? "").trim();
  const balance = /^-?0+([.,]0{1,2})?$/.test(raw) ? 0 : parseSignedAmount(raw);
  if (balance === null) return { error: "Poné un saldo válido (ej. 1.234,56)." };

  const supabase = await createClient();
  const today = todayISO();
  const { data: daily } = await supabase
    .from("accounts")
    .select("id")
    .eq("is_daily", true)
    .maybeSingle();
  if (!daily) return { error: "No hay cuenta del día a día." };

  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("account_id", daily.id)
    .eq("type", "saldo_inicial");
  if (count) return { error: "Ya hay un saldo inicial: editalo desde Movimientos." };

  const { data: saldos, error: rpcError } = await supabase.rpc("saldos_cuentas", { p_hoy: today });
  if (rpcError) return { error: `No se pudo calcular: ${rpcError.message}` };
  const cargado = Number(
    (saldos as SaldoRow[]).find((s) => s.account_id === daily.id)?.movimientos ?? 0,
  );

  const { data: first } = await supabase
    .from("transactions")
    .select("date")
    .or(`account_id.eq.${daily.id},to_account_id.eq.${daily.id}`)
    .order("date")
    .limit(1)
    .maybeSingle();
  const dayBefore = (iso: string) =>
    new Date(Date.parse(`${iso}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
  const endPrevMonth = dayBefore(`${today.slice(0, 7)}-01`);
  const date =
    first?.date && dayBefore(first.date) < endPrevMonth ? dayBefore(first.date) : endPrevMonth;

  const amount = Math.round((balance - cargado) * 100) / 100;
  const { error } = await supabase.from("transactions").insert({
    type: "saldo_inicial",
    amount,
    date,
    account_id: daily.id,
    name: "Saldo inicial",
  });
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  redirect("/patrimonio");
}
