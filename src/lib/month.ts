import type { Account, Category, Transaction } from "./types";

// ─── Meses ("2026-10") ──────────────────────────────────────────────────────

export function isMonth(s: string | undefined): s is string {
  return !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

// "2026-10" → "Octubre 2026"
export function monthLabel(month: string) {
  const s = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
  return (s[0].toUpperCase() + s.slice(1)).replace(" de ", " ");
}

// "2026-10" → "septiembre"
export function prevMonthName(month: string) {
  return new Intl.DateTimeFormat("es-ES", { month: "long", timeZone: "UTC" }).format(
    new Date(`${addMonths(month, -1)}-01T00:00:00Z`),
  );
}

// Efecto neto de unos movimientos sobre el saldo de una cuenta.
export function netForAccount(txs: Transaction[], accountId: string) {
  let net = 0;
  for (const t of txs) {
    if (t.account_id === accountId) {
      net += ["ingreso", "devolucion", "saldo_inicial"].includes(t.type) ? t.amount : -t.amount;
    } else if (t.to_account_id === accountId && t.type === "transferencia") {
      net += t.amount;
    }
  }
  return net;
}

// ─── Resumen del mes ────────────────────────────────────────────────────────

export type CategoryRow = {
  id: string;
  name: string;
  paid: number;
  pending: number;
  pendingItems: { name: string; amount: number }[];
};

export type MonthSummary = {
  ingresos: number;
  gastado: number;
  pendientes: number;
  transferencias: number; // neto: entra (+) o sale (−) de la cuenta diaria
  queda: number;
  categories: CategoryRow[];
  upcoming: { name: string; date: string; amount: number; recurring: boolean }[];
};

// Movimientos del mes (por mes_imputacion). Resumen de la cuenta diaria (Santander)
// y gasto por categoría de todas las cuentas en EUR.
export function summarizeMonth({
  txs,
  accounts,
  categories,
  dailyId,
  saldoAnterior,
  today,
}: {
  txs: Transaction[];
  accounts: Pick<Account, "id" | "currency">[];
  categories: Pick<Category, "id" | "name" | "parent_id" | "sort">[];
  dailyId: string;
  saldoAnterior: number;
  today: string;
}): MonthSummary {
  let ingresos = 0;
  let gastado = 0;
  let pendientes = 0;
  let transferencias = 0;
  const upcoming: MonthSummary["upcoming"] = [];

  const catById = new Map(categories.map((c) => [c.id, c]));
  const catName = (id: string | null) => (id ? catById.get(id)?.name : undefined);

  for (const t of txs) {
    const future = t.date > today;
    if (t.account_id === dailyId) {
      if (t.type === "ingreso") ingresos += t.amount;
      else if (t.type === "gasto") {
        if (future) {
          pendientes += t.amount;
          upcoming.push({
            name: t.name || catName(t.category_id) || "",
            date: t.date,
            amount: t.amount,
            recurring: !!t.recurring_id,
          });
        } else gastado += t.amount;
      } else if (t.type === "devolucion") {
        if (future) pendientes -= t.amount;
        else gastado -= t.amount;
      } else if (t.type === "transferencia") transferencias -= t.amount;
      // saldo_inicial dentro del mes: se trata como entrada
      else if (t.type === "saldo_inicial") ingresos += t.amount;
    } else if (t.to_account_id === dailyId && t.type === "transferencia") {
      transferencias += t.amount;
    }
  }

  // Por categoría principal, todas las cuentas en EUR.
  const eur = new Set(accounts.filter((a) => a.currency === "EUR").map((a) => a.id));
  const rows = new Map<string, CategoryRow>();
  for (const t of txs) {
    if (!eur.has(t.account_id) || !t.category_id) continue;
    if (t.type !== "gasto" && t.type !== "devolucion") continue;
    const cat = catById.get(t.category_id);
    if (!cat) continue;
    const parent = cat.parent_id ? (catById.get(cat.parent_id) ?? cat) : cat;
    const row =
      rows.get(parent.id) ??
      rows.set(parent.id, { id: parent.id, name: parent.name, paid: 0, pending: 0, pendingItems: [] }).get(parent.id)!;
    const sign = t.type === "gasto" ? 1 : -1;
    if (t.date > today) {
      row.pending += sign * t.amount;
      if (t.type === "gasto") row.pendingItems.push({ name: t.name || cat.name, amount: t.amount });
    } else row.paid += sign * t.amount;
  }

  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  return {
    ingresos,
    gastado,
    pendientes,
    transferencias,
    queda: saldoAnterior + ingresos - gastado - pendientes + transferencias,
    categories: [...rows.values()]
      .filter((r) => r.paid + r.pending > 0.004)
      .sort((a, b) => b.paid + b.pending - (a.paid + a.pending)),
    upcoming,
  };
}
