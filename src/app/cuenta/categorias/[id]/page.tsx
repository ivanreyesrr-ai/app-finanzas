import { notFound } from "next/navigation";
import { CategoryForm } from "../category-form";
import { loadCategories } from "../load";

export default async function EditarCategoria({ params }: PageProps<"/cuenta/categorias/[id]">) {
  const { id } = await params;
  const { all, childrenOf } = await loadCategories();
  const c = all.find((x) => x.id === id);
  if (!c) notFound();

  const parent = c.parent_id ? (all.find((x) => x.id === c.parent_id) ?? null) : null;
  // Hermanas para el orden: las subcategorías de la misma categoría, o las
  // principales del mismo tipo (gastos / ingresos).
  const siblings = parent
    ? childrenOf(parent.id)
    : all.filter((x) => !x.parent_id && x.kind === c.kind);
  const index = siblings.findIndex((x) => x.id === id);

  return (
    <CategoryForm
      key={`${c.id}-${c.sort}-${c.archived}`}
      initial={c}
      parent={parent && { id: parent.id, name: parent.name }}
      subs={parent ? [] : childrenOf(c.id)}
      position={{ index: index + 1, total: siblings.length }}
      showLimit={c.cycle_limit !== null}
    />
  );
}
