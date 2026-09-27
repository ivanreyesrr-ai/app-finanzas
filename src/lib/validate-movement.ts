import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAmount } from "./format";

export type MovementType = "gasto" | "ingreso" | "transferencia";
const TYPES: MovementType[] = ["gasto", "ingreso", "transferencia"];

export type ValidMovement = {
  type: MovementType;
  amount: number;
  name: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
};

export function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

// Campos comunes de "Cargar movimiento" y de un recurrente.
// RLS garantiza que solo se ven cuentas y categorías propias.
export async function validateMovement(
  supabase: SupabaseClient,
  formData: FormData,
): Promise<{ error: string } | { data: ValidMovement }> {
  const type = String(formData.get("type")) as MovementType;
  const amount = parseAmount(String(formData.get("amount") ?? ""));
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const accountId = String(formData.get("account_id") ?? "");
  const toAccountId = String(formData.get("to_account_id") ?? "") || null;
  const categoryId = String(formData.get("category_id") ?? "") || null;

  if (!TYPES.includes(type)) return { error: "Tipo de movimiento no válido." };
  if (amount === null) return { error: "Poné un importe válido (ej. 24,50)." };

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

  return {
    data: {
      type,
      amount,
      name,
      account_id: accountId,
      to_account_id: type === "transferencia" ? toAccountId : null,
      category_id: type === "transferencia" ? null : categoryId,
    },
  };
}
