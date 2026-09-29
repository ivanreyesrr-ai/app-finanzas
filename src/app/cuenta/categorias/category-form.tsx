"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Chevron, Group, groupRow, SheetHeader } from "@/components/ios";
import { moveCategory, saveCategory, toggleArchive } from "./actions";

export type CategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
  kind: "gasto" | "ingreso";
  cycle_limit: number | null;
  archived: boolean;
};

const row = `${groupRow} relative`;

export function CategoryForm({
  initial,
  parent,
  subs = [],
  position,
  showLimit,
}: {
  initial: CategoryRow | null;
  parent: { id: string; name: string } | null;
  subs?: CategoryRow[];
  position?: { index: number; total: number };
  showLimit: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveCategory, null);
  const [name, setName] = useState(initial?.name ?? "");
  const [limit, setLimit] = useState(
    initial?.cycle_limit != null ? String(initial.cycle_limit).replace(".", ",") : "",
  );
  const back = parent ? `/cuenta/categorias/${parent.id}` : "/cuenta/categorias";
  const title = initial
    ? parent
      ? "Subcategoría"
      : "Categoría"
    : parent
      ? "Nueva subcategoría"
      : "Nueva categoría";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <form action={formAction} className="flex flex-col">
        <input type="hidden" name="id" value={initial?.id ?? ""} />
        <input type="hidden" name="parent_id" value={parent?.id ?? ""} />

        <SheetHeader title={title} cancelHref={back} saving={pending} />

        <div className="flex flex-col gap-2 px-4 pt-3 pb-6">
          {parent && <p className="ml-4 text-[13px] text-muted">En {parent.name}</p>}
          <div className="flex flex-col rounded-[10px] bg-card pl-4">
            <div className={row}>
              <label htmlFor="name" className="w-24 shrink-0 text-[17px]">
                Nombre
              </label>
              <input
                id="name"
                name="name"
                autoComplete="off"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-w-0 grow bg-transparent text-[17px] outline-none"
              />
            </div>
            {showLimit && (
              <div className={row}>
                <label htmlFor="cycle_limit" className="w-24 shrink-0 text-[17px]">
                  Límite
                </label>
                <input
                  id="cycle_limit"
                  name="cycle_limit"
                  inputMode="decimal"
                  autoComplete="off"
                  required
                  value={limit}
                  onChange={(e) => setLimit(e.target.value.replace(/[^\d.,]/g, ""))}
                  placeholder="220"
                  className="min-w-0 grow bg-transparent text-[17px] outline-none placeholder:text-muted/60"
                />
                <span className="text-[17px] text-muted">€ por ciclo</span>
              </div>
            )}
          </div>
          {state?.error && (
            <p role="alert" className="ml-4 text-[15px] text-negative">
              {state.error}
            </p>
          )}
        </div>
      </form>

      {initial && (
        <div className="flex flex-col gap-8 pb-[max(env(safe-area-inset-bottom),20px)]">
          {!parent && (
            <div>
              <p className="mx-8 mb-1.5 text-[13px] text-muted uppercase">Subcategorías</p>
              <Group>
                {subs.map((s) => (
                  <Link key={s.id} href={`/cuenta/categorias/${s.id}`} className={groupRow}>
                    <span className={`text-[17px] ${s.archived ? "text-muted" : ""}`}>
                      {s.name}
                      {s.archived && " · archivada"}
                    </span>
                    <Chevron />
                  </Link>
                ))}
                <Link href={`/cuenta/categorias/nueva?padre=${initial.id}`} className={groupRow}>
                  <span className="text-[17px] text-accent">Añadir subcategoría</span>
                </Link>
              </Group>
            </div>
          )}

          {position && (
            <div>
              <p className="mx-8 mb-1.5 text-[13px] text-muted uppercase">
                Orden: {position.index} de {position.total}
              </p>
              <Group>
                {([-1, 1] as const).map((dir) => (
                  <form key={dir} action={moveCategory} className={groupRow}>
                    <input type="hidden" name="id" value={initial.id} />
                    <input type="hidden" name="parent_id" value={parent?.id ?? ""} />
                    <input type="hidden" name="dir" value={dir} />
                    <button
                      disabled={dir === -1 ? position.index === 1 : position.index === position.total}
                      className="w-full text-left text-[17px] text-accent disabled:text-muted"
                    >
                      {dir === -1 ? "Subir" : "Bajar"}
                    </button>
                  </form>
                ))}
              </Group>
            </div>
          )}

          <div>
            <Group>
              <form action={toggleArchive} className={groupRow}>
                <input type="hidden" name="id" value={initial.id} />
                <input type="hidden" name="parent_id" value={parent?.id ?? ""} />
                <input type="hidden" name="archived" value={initial.archived ? "0" : "1"} />
                <button className={`w-full text-left text-[17px] ${initial.archived ? "text-accent" : "text-negative"}`}>
                  {initial.archived ? "Desarchivar" : "Archivar"}
                </button>
              </form>
            </Group>
            <p className="mx-8 mt-1.5 text-[13px] text-muted">
              {initial.archived
                ? "Está archivada: no aparece al cargar movimientos."
                : "Archivada deja de aparecer al cargar movimientos; los movimientos que ya la usan la conservan."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
