import { createClient } from "@/lib/supabase/server";
import type { CategoryRow } from "./category-form";

// Todas las categorías, archivadas incluidas, en orden.
export async function loadCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, parent_id, kind, cycle_limit, archived, sort")
    .order("sort")
    .order("id")
    .returns<(CategoryRow & { sort: number })[]>();
  const all = (data ?? []).map((c) => ({
    ...c,
    cycle_limit: c.cycle_limit === null ? null : Number(c.cycle_limit),
  }));
  const childrenOf = (id: string) => all.filter((c) => c.parent_id === id);
  // Una categoría es Flex si alguna subcategoría suya tiene límite por ciclo.
  const isFlexParent = (id: string) => childrenOf(id).some((c) => c.cycle_limit !== null);
  return { all, childrenOf, isFlexParent };
}
