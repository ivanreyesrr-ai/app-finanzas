import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";
import type { Account, Transaction } from "@/lib/types";
import { DevolucionForm } from "./devolucion-form";

export default async function DevolucionPage({
  params,
}: PageProps<"/movimientos/[id]/devolucion">) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: original }, { data: accounts }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, account_id, to_account_id, date, mes_imputacion, amount, type, category_id, name")
      .eq("id", id)
      .maybeSingle<Transaction>(),
    supabase
      .from("accounts")
      .select("id, name, type, currency, is_daily, sort")
      .order("sort")
      .returns<Account[]>(),
  ]);
  if (!original || original.type !== "gasto") notFound();

  return (
    <DevolucionForm
      original={{ ...original, amount: Number(original.amount) }}
      accounts={accounts ?? []}
      today={todayISO()}
    />
  );
}
