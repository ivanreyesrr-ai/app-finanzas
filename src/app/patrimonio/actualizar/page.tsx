import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";
import { usdToEur } from "@/lib/fx";
import type { Account } from "@/lib/types";
import { ActualizarForm } from "./actualizar-form";

export default async function ActualizarSaldo() {
  const supabase = await createClient();
  const [{ data: accounts }, fx] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type, currency, is_daily, sort")
      .eq("is_daily", false)
      .order("sort")
      .returns<Account[]>(),
    usdToEur(),
  ]);

  return (
    <ActualizarForm accounts={accounts ?? []} today={todayISO()} fxRate={fx?.rate ?? null} />
  );
}
