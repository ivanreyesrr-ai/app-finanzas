import Link from "next/link";
import {
  Chevron,
  Group,
  groupRow,
  plusIcon,
  RoundButton,
  SectionTitle,
  SubPageHeader,
} from "@/components/ios";
import { loadCategories } from "./load";

export default async function CategoriasPage() {
  const { all, childrenOf } = await loadCategories();
  const parents = all.filter((c) => !c.parent_id);

  const section = (kind: "gasto" | "ingreso", title: string) => {
    const list = parents.filter((p) => p.kind === kind);
    if (!list.length) return null;
    return (
      <>
        <SectionTitle>{title}</SectionTitle>
        <Group>
          {list.map((p) => {
            const subs = childrenOf(p.id).filter((s) => !s.archived);
            return (
              <Link key={p.id} href={`/cuenta/categorias/${p.id}`} className={groupRow}>
                <div className="flex min-w-0 grow flex-col">
                  <div className={`text-[17px] ${p.archived ? "text-muted" : ""}`}>
                    {p.name}
                    {p.archived && " · archivada"}
                  </div>
                  {subs.length > 0 && (
                    <div className="truncate text-[13px] text-muted">
                      {subs.map((s) => s.name).join(", ")}
                    </div>
                  )}
                </div>
                <Chevron />
              </Link>
            );
          })}
        </Group>
      </>
    );
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-10">
      <SubPageHeader
        back="/cuenta"
        backLabel="Mi cuenta"
        title="Categorías"
        actions={
          <RoundButton href="/cuenta/categorias/nueva" label="Nueva categoría">
            {plusIcon}
          </RoundButton>
        }
      />
      {section("gasto", "Gastos")}
      {section("ingreso", "Ingresos")}
    </main>
  );
}
