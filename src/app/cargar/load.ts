import { createClient } from "@/lib/supabase/server";
import { flexCycle } from "@/lib/flex";
import { todayISO } from "@/lib/format";
import type { Account, Category } from "@/lib/types";
import type { FlexMovement } from "./cargar-form";

// Datos del formulario de movimiento: cuentas, categorías y el gasto Flex
// reciente (para "te quedan X de 220 €").
export async function loadMovementForm() {
  const supabase = await createClient();
  const today = todayISO();

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

  // Movimientos Flex desde el ciclo anterior.
  const flexIds = (categories ?? [])
    .filter((c) => c.cycle_limit !== null)
    .map((c) => c.id);
  const since = flexCycle(flexCycle(today).start.replace(/-20$/, "-19")).start;
  const { data: flex } = flexIds.length
    ? await supabase
        .from("transactions")
        .select("date, amount, type, category_id")
        .in("category_id", flexIds)
        .in("type", ["gasto", "devolucion"])
        .gte("date", since)
        .returns<FlexMovement[]>()
    : { data: [] };

  return {
    supabase,
    today,
    accounts: accounts ?? [],
    categories: categories ?? [],
    flexMovements: (flex ?? []).map((m) => ({ ...m, amount: Number(m.amount) })),
  };
}
