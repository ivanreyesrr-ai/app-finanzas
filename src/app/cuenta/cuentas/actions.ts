"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moveInOrder } from "@/lib/reorder";
import type { AccountType } from "@/lib/types";

export type AccountState = { error: string } | null;

const TYPES: AccountType[] = ["corriente", "ahorro", "inversion", "efectivo"];

export async function saveAccount(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const id = String(formData.get("id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type")) as AccountType;
  const currency = String(formData.get("currency"));

  if (!name) return { error: "Poné un nombre." };
  if (!TYPES.includes(type)) return { error: "Elegí el tipo de cuenta." };

  const supabase = await createClient();

  if (id) {
    // La moneda no se cambia: rompería los saldos ya cargados.
    const { error } = await supabase.from("accounts").update({ name, type }).eq("id", id);
    if (error) return { error: `No se pudo guardar: ${error.message}` };
  } else {
    if (currency !== "EUR" && currency !== "USD") return { error: "Elegí la moneda." };
    const { data: last } = await supabase
      .from("accounts")
      .select("sort")
      .order("sort", { ascending: false })
      .limit(1)
      .maybeSingle<{ sort: number }>();
    const { error } = await supabase
      .from("accounts")
      .insert({ name, type, currency, sort: (last?.sort ?? 0) + 1 });
    if (error) return { error: `No se pudo crear: ${error.message}` };
  }

  redirect("/cuenta/cuentas");
}

export async function moveAccount(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const dir = Number(formData.get("dir")) === -1 ? -1 : 1;
  const supabase = await createClient();
  const { data: all } = await supabase.from("accounts").select("id").order("sort").order("id");
  await moveInOrder(supabase, "accounts", all ?? [], id, dir);
  redirect(`/cuenta/cuentas/${id}`);
}

// Solo se borra una cuenta sin movimientos ni recurrentes (la diaria nunca).
export async function deleteAccount(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("is_daily")
    .eq("id", id)
    .maybeSingle<{ is_daily: boolean }>();
  if (!account) redirect("/cuenta/cuentas");
  if (account.is_daily) redirect(`/cuenta/cuentas/${id}?error=diaria`);

  const [{ count: txs }, { count: recs }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .or(`account_id.eq.${id},to_account_id.eq.${id}`),
    supabase
      .from("recurring")
      .select("id", { count: "exact", head: true })
      .or(`account_id.eq.${id},to_account_id.eq.${id}`),
  ]);
  if ((txs ?? 0) > 0 || (recs ?? 0) > 0) redirect(`/cuenta/cuentas/${id}?error=en-uso`);

  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) redirect(`/cuenta/cuentas/${id}?error=borrar`);
  redirect("/cuenta/cuentas");
}
