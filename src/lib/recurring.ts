import { addMonths } from "./month";
import type { Transaction } from "./types";

export type Frequency = "mensual" | "bimestral" | "anual";

export type Recurring = {
  id: string;
  name: string;
  amount: number;
  type: "gasto" | "ingreso" | "transferencia";
  category_id: string | null;
  account_id: string;
  to_account_id: string | null;
  day_of_month: number;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  active: boolean;
  last_generated_month: string | null;
};

// Misma regla que public.fecha_recurrente en la base (migración 005).
// month = "2026-10". Devuelve "YYYY-MM-DD" o null si ese mes no le toca.
export function fechaRecurrente(
  r: Pick<Recurring, "start_date" | "end_date" | "day_of_month" | "frequency">,
  month: string,
): string | null {
  const [y, m] = month.split("-").map(Number);
  const [sy, sm] = r.start_date.split("-").map(Number);
  const diff = y * 12 + m - (sy * 12 + sm);
  if (diff < 0) return null;
  if (r.frequency === "bimestral" && diff % 2 !== 0) return null;
  if (r.frequency === "anual" && diff % 12 !== 0) return null;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const d = `${month}-${String(Math.min(r.day_of_month, lastDay)).padStart(2, "0")}`;
  if (d < r.start_date) return null;
  if (r.end_date && d > r.end_date) return null;
  return d;
}

// Hasta qué mes marcar como "ya generado" al crear o reanudar un recurrente,
// para no cargar meses anteriores ni una fecha de este mes que ya pasó.
export function initialLastGenerated(
  r: Pick<Recurring, "start_date" | "end_date" | "day_of_month" | "frequency">,
  today: string,
) {
  const current = today.slice(0, 7);
  const startMonth = r.start_date.slice(0, 7);
  if (startMonth > current) return `${addMonths(startMonth, -1)}-01`;
  const thisMonth = fechaRecurrente(r, current);
  return thisMonth && thisMonth < today
    ? `${current}-01`
    : `${addMonths(current, -1)}-01`;
}

// Próxima fecha en la que cae (desde hoy inclusive), buscando hasta 2 años.
export function nextDate(r: Recurring, today: string): string | null {
  const current = today.slice(0, 7);
  for (let i = 0; i < 25; i++) {
    const d = fechaRecurrente(r, addMonths(current, i));
    if (d && d >= today) return d;
  }
  return null;
}

// Movimientos que todavía no existen en la base (meses sin generar) para el rango
// de meses dado, como proyección. mesImputacion calcula el mes al que cuentan.
export function projectRecurring(
  recurring: Recurring[],
  months: string[],
  mesImputacion: (t: { date: string; category_id: string | null }) => string,
): Transaction[] {
  const out: Transaction[] = [];
  for (const r of recurring) {
    if (!r.active) continue;
    for (const month of months) {
      if (r.last_generated_month && `${month}-01` <= r.last_generated_month) continue;
      const date = fechaRecurrente(r, month);
      if (!date) continue;
      out.push({
        id: `proy-${r.id}-${month}`,
        account_id: r.account_id,
        to_account_id: r.to_account_id,
        date,
        mes_imputacion: mesImputacion({ date, category_id: r.category_id }),
        amount: r.amount,
        type: r.type,
        category_id: r.category_id,
        name: r.name,
        recurring_id: r.id,
      });
    }
  }
  return out;
}

// Comprometido por mes: mensuales + bimestrales/2 + anuales/12 (solo gastos activos).
export function monthlyCommitment(recurring: Recurring[]) {
  const factor: Record<Frequency, number> = { mensual: 1, bimestral: 1 / 2, anual: 1 / 12 };
  return recurring
    .filter((r) => r.active && r.type === "gasto")
    .reduce((s, r) => s + r.amount * factor[r.frequency], 0);
}
