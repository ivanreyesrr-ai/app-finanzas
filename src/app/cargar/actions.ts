"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseAmount } from "@/lib/format";

export type CargarState = { error: string } | null;

const TYPES = ["gasto", "ingreso", "transferencia"] as const;
type CargarType = (typeof TYPES)[number];

export async function createTransaction(
  _prev: CargarState,
  formData: FormData,
): Promise<CargarState> {
  const type = String(formData.get("type")) as CargarType;
  const amount = parseAmount(String(formData.get("amount") ?? ""));
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const date = String(formData.get("date") ?? "");
  const accountId = String(formData.get("account_id") ?? "");
  const toAccountId = String(formData.get("to_account_id") ?? "") || null;
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const repeat = formData.get("repeat") === "on";

  if (!TYPES.includes(type)) return { error: "Tipo de movimiento no válido." };
  if (amount === null) return { error: "Poné un importe válido (ej. 24,50)." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))
    return { error: "Fecha no válida." };

  const supabase = await createClient();

  // RLS garantiza que solo vemos cuentas y categorías propias.
  const { data: accounts } = await supabase.from("accounts").select("id");
  const accountIds = new Set(accounts?.map((a) => a.id));
  if (!accountIds.has(accountId)) return { error: "Elegí una cuenta." };

  if (type === "transferencia") {
    if (!toAccountId || !accountIds.has(toAccountId))
      return { error: "Elegí la cuenta de destino." };
    if (toAccountId === accountId)
      return { error: "Origen y destino tienen que ser cuentas distintas." };
  } else {
    if (!categoryId) return { error: "Elegí una categoría." };
    const { data: cats } = await supabase
      .from("categories")
      .select("id, kind, parent_id");
    const cat = cats?.find((c) => c.id === categoryId);
    if (!cat || cat.kind !== type) return { error: "Categoría no válida." };
    if (cats?.some((c) => c.parent_id === categoryId))
      return { error: "Elegí una subcategoría." };
  }

  const base = {
    name,
    amount,
    type,
    account_id: accountId,
    to_account_id: type === "transferencia" ? toAccountId : null,
    category_id: type === "transferencia" ? null : categoryId,
  };

  let recurringId: string | null = null;
  if (repeat) {
    const { data, error } = await supabase
      .from("recurring")
      .insert({
        ...base,
        day_of_month: Number(date.slice(8, 10)),
        frequency: "mensual",
        start_date: date,
      })
      .select("id")
      .single();
    if (error) return { error: `No se pudo crear el recurrente: ${error.message}` };
    recurringId = data.id;
  }

  const { error } = await supabase
    .from("transactions")
    .insert({ ...base, date, recurring_id: recurringId });

  if (error) {
    // Sin transacción entre tablas: si falla el movimiento, deshacemos el recurrente.
    if (recurringId) await supabase.from("recurring").delete().eq("id", recurringId);
    return { error: `No se pudo guardar: ${error.message}` };
  }

  redirect("/");
}
