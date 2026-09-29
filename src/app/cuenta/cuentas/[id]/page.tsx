import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";
import { AccountForm } from "../account-form";

export default async function EditarCuenta({
  params,
  searchParams,
}: PageProps<"/cuenta/cuentas/[id]">) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, type, currency, is_daily, sort")
    .order("sort")
    .order("id")
    .returns<Account[]>();

  const index = (accounts ?? []).findIndex((a) => a.id === id);
  if (index < 0) notFound();

  return (
    <AccountForm
      key={accounts![index].sort}
      initial={accounts![index]}
      position={{ index: index + 1, total: accounts!.length }}
      error={typeof error === "string" ? error : undefined}
    />
  );
}
