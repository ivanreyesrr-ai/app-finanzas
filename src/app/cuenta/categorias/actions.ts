"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseAmount } from "@/lib/format";
import { moveInOrder } from "@/lib/reorder";

export type CategoryState = { error: string } | null;

// Adónde volver: la subcategoría a su categoría; la categoría a la lista.
const backTo = (parentId: string | null) =>
  parentId ? `/cuenta/categorias/${parentId}` : "/cuenta/categorias";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function siblingsOf(supabase: Supabase, parentId: string | null) {
  const q = supabase.from("categories").select("id, sort, kind").order("sort").order("id");
  return parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
}

export async function saveCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const id = String(formData.get("id") ?? "") || null;
  const parentId = String(formData.get("parent_id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim();
  const withLimit = formData.has("cycle_limit");
  const limit = withLimit ? parseAmount(String(formData.get("cycle_limit"))) : null;

  if (!name) return { error: "Poné un nombre." };
  if (withLimit && limit === null) return { error: "El límite tiene que ser un importe mayor que 0." };

  const supabase = await createClient();

  if (id) {
    const { error } = await supabase
      .from("categories")
      .update(withLimit ? { name, cycle_limit: limit } : { name })
      .eq("id", id);
    if (error) return { error: `No se pudo guardar: ${error.message}` };
    redirect(backTo(parentId));
  }

  // Nueva: las categorías principales nuevas son de gasto; las subcategorías heredan el tipo.
  let kind = "gasto";
  if (parentId) {
    const { data: parent } = await supabase
      .from("categories")
      .select("kind")
      .eq("id", parentId)
      .maybeSingle<{ kind: string }>();
    if (!parent) return { error: "No existe la categoría principal." };
    kind = parent.kind;
  }
  const { data: siblings } = await siblingsOf(supabase, parentId);
  const sort = Math.max(0, ...(siblings ?? []).map((s) => s.sort)) + 1;
  const { error } = await supabase.from("categories").insert({
    name,
    parent_id: parentId,
    kind,
    sort,
    cycle_limit: withLimit ? limit : null,
  });
  if (error) return { error: `No se pudo crear: ${error.message}` };
  redirect(backTo(parentId));
}

export async function moveCategory(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parentId = String(formData.get("parent_id") ?? "") || null;
  const dir = Number(formData.get("dir")) === -1 ? -1 : 1;
  const supabase = await createClient();
  const { data: siblings } = await siblingsOf(supabase, parentId);
  // Las principales se ordenan dentro de su tipo (gastos / ingresos).
  const me = siblings?.find((s) => s.id === id);
  const list = (siblings ?? []).filter((s) => s.kind === me?.kind);
  await moveInOrder(supabase, "categories", list, id, dir);
  redirect(`/cuenta/categorias/${id}`);
}

// Archivar: deja de aparecer al cargar, pero los movimientos la conservan.
export async function toggleArchive(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parentId = String(formData.get("parent_id") ?? "") || null;
  const archived = formData.get("archived") === "1";
  const supabase = await createClient();
  await supabase.from("categories").update({ archived }).eq("id", id);
  redirect(backTo(parentId));
}
