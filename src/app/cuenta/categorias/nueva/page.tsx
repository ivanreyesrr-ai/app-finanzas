import { notFound } from "next/navigation";
import { CategoryForm } from "../category-form";
import { loadCategories } from "../load";

// /cuenta/categorias/nueva            → categoría principal (de gasto)
// /cuenta/categorias/nueva?padre=<id> → subcategoría de esa categoría
export default async function NuevaCategoria({
  searchParams,
}: PageProps<"/cuenta/categorias/nueva">) {
  const { padre } = await searchParams;
  if (typeof padre !== "string") return <CategoryForm initial={null} parent={null} showLimit={false} />;

  const { all, isFlexParent } = await loadCategories();
  const parent = all.find((x) => x.id === padre && !x.parent_id);
  if (!parent) notFound();
  return (
    <CategoryForm
      initial={null}
      parent={{ id: parent.id, name: parent.name }}
      showLimit={isFlexParent(parent.id)}
    />
  );
}
