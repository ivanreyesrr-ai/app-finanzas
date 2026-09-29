import type { Account } from "./types";

export type SaldoRow = {
  account_id: string;
  snapshot_date: string | null;
  snapshot_balance: number | null;
  snapshot_fx_rate: number | null;
  movimientos: number;
};

export type PatrimonioRow = {
  id: string;
  name: string;
  role: string;
  currency: "EUR" | "USD";
  balance: number; // en la moneda de la cuenta
  eur: number | null; // null: USD sin cambio disponible
  pct: number | null; // sobre el total positivo
  color: string;
  updated: string | null; // fecha del último saldo cargado a mano
  manual: boolean; // se puede "Actualizar saldo"
};

const COLORS = ["#1F5E4A", "#7FA38F", "#C9962E", "#8E8E93", "#8A4B2A", "#2B4C7E"];

export function accountRole(a: Pick<Account, "type" | "currency">) {
  switch (a.type) {
    case "corriente":
      return "Día a día";
    case "ahorro":
      return "Ahorro corto plazo";
    case "inversion":
      return "Inversión · ETFs";
    case "efectivo":
      return a.currency === "USD" ? "Dólares en mano" : "Efectivo";
  }
}

// fx: cambio USD→EUR del día (o null si no se pudo obtener).
// Sin cambio del día, se usa el guardado con el último saldo de la cuenta.
export function buildPatrimonio(
  accounts: Pick<Account, "id" | "name" | "type" | "currency" | "is_daily">[],
  saldos: SaldoRow[],
  fx: number | null,
) {
  const byId = new Map(saldos.map((s) => [s.account_id, s]));

  const rows = accounts.map((a) => {
    const s = byId.get(a.id);
    const balance = Number(s?.snapshot_balance ?? 0) + Number(s?.movimientos ?? 0);
    const rate = a.currency === "EUR" ? 1 : (fx ?? (s?.snapshot_fx_rate ? Number(s.snapshot_fx_rate) : null));
    return {
      id: a.id,
      name: a.name,
      role: accountRole(a),
      currency: a.currency,
      balance,
      eur: rate === null ? null : Math.round(balance * rate * 100) / 100,
      pct: null as number | null,
      color: "",
      updated: s?.snapshot_date ?? null,
      manual: !a.is_daily,
    };
  });

  rows.sort((x, y) => (y.eur ?? 0) - (x.eur ?? 0));
  const total = rows.reduce((sum, r) => sum + (r.eur ?? 0), 0);
  const positive = rows.reduce((sum, r) => sum + Math.max(r.eur ?? 0, 0), 0);
  rows.forEach((r, i) => {
    r.color = COLORS[i % COLORS.length];
    r.pct = r.eur !== null && r.eur > 0 && positive > 0 ? (r.eur / positive) * 100 : null;
  });

  return { rows: rows as PatrimonioRow[], total, missingFx: rows.some((r) => r.eur === null) };
}
