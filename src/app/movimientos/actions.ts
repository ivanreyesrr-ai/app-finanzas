"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, parseSignedAmount } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import { isISODate, validateMovement } from "@/lib/validate-movement";

export type MovementState = { error: string } | null;

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function getTransaction(supabase: Supabase, id: string) {
  const { data } = await supabase
    .from("transactions")
    .select("id, account_id, to_account_id, date, mes_imputacion, amount, type, category_id, name, recurring_id, related_id")
    .eq("id", id)
    .maybeSingle<Transaction>();
  return data;
}

async function accountExists(supabase: Supabase, id: string) {
  const { data } = await supabase.from("accounts").select("id").eq("id", id).maybeSingle();
  return !!data;
}

// Vuelve a Movimientos en el mes al que cuenta el movimiento.
function backTo(mesImputacion: string) {
  redirect(`/movimientos?mes=${mesImputacion.slice(0, 7)}`);
}

export async function updateTransaction(
  _prev: MovementState,
  formData: FormData,
): Promise<MovementState> {
  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!isISODate(date)) return { error: "Fecha no válida." };

  const supabase = await createClient();
  const current = await getTransaction(supabase, id);
  if (!current) return { error: "El movimiento ya no existe." };

  let fields: Record<string, unknown>;
  if (current.type === "saldo_inicial" || current.type === "devolucion") {
    // Tipo y categoría fijos: solo importe, nombre, fecha y cuenta.
    const raw = String(formData.get("amount") ?? "");
    const amount = current.type === "saldo_inicial" ? parseSignedAmount(raw) : parseAmount(raw);
    if (amount === null) return { error: "Poné un importe válido (ej. 24,50)." };
    const accountId = String(formData.get("account_id") ?? "");
    if (!(await accountExists(supabase, accountId))) return { error: "Elegí una cuenta." };
    fields = {
      amount,
      name: String(formData.get("name") ?? "").trim().slice(0, 100),
      account_id: accountId,
    };
  } else {
    const valid = await validateMovement(supabase, formData);
    if ("error" in valid) return valid;
    fields = valid.data;
  }

  const { data, error } = await supabase
    .from("transactions")
    .update({ ...fields, date })
    .eq("id", id)
    .select("mes_imputacion")
    .single();
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  backTo(data.mes_imputacion);
  return null;
}

export async function deleteTransaction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const current = await getTransaction(supabase, id);
  if (!current) redirect("/movimientos");

  // Las devoluciones de un gasto se borran con él.
  await supabase.from("transactions").delete().eq("related_id", id);
  await supabase.from("transactions").delete().eq("id", id);

  backTo(current.mes_imputacion);
}

export async function createDevolucion(
  _prev: MovementState,
  formData: FormData,
): Promise<MovementState> {
  const relatedId = String(formData.get("related_id") ?? "");
  const amount = parseAmount(String(formData.get("amount") ?? ""));
  const date = String(formData.get("date") ?? "");
  const accountId = String(formData.get("account_id") ?? "");

  if (amount === null) return { error: "Poné un importe válido (ej. 24,50)." };
  if (!isISODate(date)) return { error: "Fecha no válida." };

  const supabase = await createClient();
  const original = await getTransaction(supabase, relatedId);
  if (!original || original.type !== "gasto")
    return { error: "Solo se puede devolver un gasto." };
  if (!(await accountExists(supabase, accountId))) return { error: "Elegí una cuenta." };

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      type: "devolucion",
      amount,
      date,
      account_id: accountId,
      category_id: original.category_id,
      related_id: original.id,
      name: `Devolución: ${original.name || "gasto"}`.slice(0, 100),
    })
    .select("mes_imputacion")
    .single();
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  backTo(data.mes_imputacion);
  return null;
}
