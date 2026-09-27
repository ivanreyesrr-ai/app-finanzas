import { createClient } from "@/lib/supabase/server";
import type { Account, Category } from "@/lib/types";

// Cuentas y categorías para el formulario de recurrente.
export async function loadFormData() {
  const supabase = await createClient();
  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type, currency, is_daily, sort")
      .order("sort")
      .returns<Account[]>(),
    supabase
      .from("categories")
      .select("id, name, parent_id, kind, cycle_limit, sort")
      .eq("archived", false)
      .order("sort")
      .returns<Category[]>(),
  ]);
  return { supabase, accounts: accounts ?? [], categories: categories ?? [] };
}
