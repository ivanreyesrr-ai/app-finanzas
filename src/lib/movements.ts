import type { Category, Transaction } from "./types";

export type Filter = "todos" | "gastos" | "ingresos" | "transferencias";

export type DayGroup = {
  date: string;
  total: number; // neto de gastos, ingresos y devoluciones del día
  items: Transaction[];
};

// Signo con que un movimiento afecta "lo que gastás/ganás" (transferencias y
// saldo inicial no cuentan).
export function signedAmount(t: Pick<Transaction, "type" | "amount">) {
  if (t.type === "gasto") return -t.amount;
  if (t.type === "ingreso" || t.type === "devolucion") return t.amount;
  return 0;
}

function matchesFilter(t: Transaction, f: Filter) {
  if (f === "gastos") return t.type === "gasto" || t.type === "devolucion";
  if (f === "ingresos") return t.type === "ingreso";
  if (f === "transferencias") return t.type === "transferencia";
  return true;
}

// Movimientos de un mes (por mes_imputacion): los Flex van en un bloque aparte
// (se descuentan de la nómina de este mes); el resto, agrupados por día, del
// más reciente al más antiguo.
export function groupMovements({
  txs,
  categories,
  query,
  filter,
}: {
  txs: Transaction[];
  categories: Pick<Category, "id" | "name" | "parent_id" | "cycle_limit">[];
  query: string;
  filter: Filter;
}) {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const q = query.trim().toLocaleLowerCase("es");

  const visible = txs.filter((t) => {
    if (!matchesFilter(t, filter)) return false;
    if (!q) return true;
    const cat = t.category_id ? catById.get(t.category_id) : undefined;
    const parent = cat?.parent_id ? catById.get(cat.parent_id) : undefined;
    return [t.name, cat?.name, parent?.name]
      .filter(Boolean)
      .some((s) => s!.toLocaleLowerCase("es").includes(q));
  });

  const isFlex = (t: Transaction) =>
    !!t.category_id && catById.get(t.category_id)?.cycle_limit != null;

  const byDate = (a: Transaction, b: Transaction) => b.date.localeCompare(a.date);
  const flexItems = visible.filter(isFlex).sort(byDate);

  const days = new Map<string, DayGroup>();
  for (const t of visible.filter((t) => !isFlex(t)).sort(byDate)) {
    const g = days.get(t.date) ?? days.set(t.date, { date: t.date, total: 0, items: [] }).get(t.date)!;
    g.items.push(t);
    g.total += signedAmount(t);
  }

  return {
    days: [...days.values()],
    flex: {
      items: flexItems,
      total: flexItems.reduce((s, t) => s + signedAmount(t), 0),
    },
  };
}
