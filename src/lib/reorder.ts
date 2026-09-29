import type { SupabaseClient } from "@supabase/supabase-js";

// Mueve una fila un lugar arriba (-1) o abajo (+1) entre sus hermanas y deja
// el orden numerado 1..n. `siblings` ya viene ordenado.
export async function moveInOrder(
  supabase: SupabaseClient,
  table: "accounts" | "categories",
  siblings: { id: string }[],
  id: string,
  dir: -1 | 1,
) {
  const ids = siblings.map((s) => s.id);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(
    ids.map((rowId, k) => supabase.from(table).update({ sort: k + 1 }).eq("id", rowId)),
  );
}
