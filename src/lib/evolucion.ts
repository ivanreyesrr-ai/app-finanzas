import { addMonths } from "./month";

// Evolución del patrimonio: cierres de mes reales, hoy y proyección.

export const PROJECTION_MONTHS = 3; // meses proyectados después del actual
export const MAX_HISTORY_MONTHS = 24;
const AVERAGE_MONTHS = 3; // meses cerrados para el resultado medio

export type EvoPoint = {
  month: string; // "2026-09"
  x: number; // posición en meses desde el inicio del primer mes
  total: number;
  kind: "cierre" | "hoy" | "fin-de-mes" | "proyeccion";
};

// "2026-09" → "2026-09-30"
export function lastDay(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function daysIn(month: string) {
  return Number(lastDay(month).slice(8, 10));
}

// Meses cerrados desde `first` hasta el anterior a `current` (como mucho MAX_HISTORY_MONTHS).
export function closedMonths(first: string, current: string) {
  let start = first;
  const oldest = addMonths(current, -MAX_HISTORY_MONTHS);
  if (start < oldest) start = oldest;
  const out: string[] = [];
  for (let m = start; m < current; m = addMonths(m, 1)) out.push(m);
  return out;
}

// Meses cerrados que entran en la media (los últimos 3 con datos).
export function averageMonths(closed: string[]) {
  return closed.slice(-AVERAGE_MONTHS);
}

// Resultado (ingresos − gastos) de cada mes, por mes de imputación.
export function monthlyResults(
  txs: { mes_imputacion: string; type: string; amount: number }[],
  months: string[],
) {
  const byMonth = new Map(months.map((m) => [m, 0]));
  for (const t of txs) {
    const m = t.mes_imputacion.slice(0, 7);
    if (!byMonth.has(m)) continue;
    const sign = t.type === "gasto" ? -1 : t.type === "ingreso" || t.type === "devolucion" ? 1 : 0;
    byMonth.set(m, byMonth.get(m)! + sign * t.amount);
  }
  return byMonth;
}

export function buildEvolution({
  start,
  closed,
  current,
  today,
  hoy,
  finDeMes,
  average,
}: {
  start: string; // primer mes del gráfico
  closed: { month: string; total: number }[];
  current: string;
  today: string;
  hoy: number;
  finDeMes: number;
  average: number | null; // null: sin meses cerrados para proyectar
}): EvoPoint[] {
  const index = (m: string) => {
    const [y1, m1] = start.split("-").map(Number);
    const [y2, m2] = m.split("-").map(Number);
    return (y2 - y1) * 12 + (m2 - m1);
  };
  const points: EvoPoint[] = closed.map((c) => ({
    month: c.month,
    x: index(c.month) + 1,
    total: c.total,
    kind: "cierre",
  }));
  const ci = index(current);
  const day = Number(today.slice(8, 10));
  points.push({ month: current, x: ci + day / daysIn(current), total: hoy, kind: "hoy" });
  if (day < daysIn(current))
    points.push({ month: current, x: ci + 1, total: finDeMes, kind: "fin-de-mes" });
  if (average !== null)
    for (let k = 1; k <= PROJECTION_MONTHS; k++)
      points.push({
        month: addMonths(current, k),
        x: ci + 1 + k,
        total: finDeMes + average * k,
        kind: "proyeccion",
      });
  return points;
}
