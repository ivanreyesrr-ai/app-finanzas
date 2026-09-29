import { createClient } from "@/lib/supabase/server";
import { formatEUR } from "@/lib/format";
import { money } from "@/lib/hidden";
import { buildPatrimonio, type SaldoRow } from "@/lib/patrimonio";
import {
  averageMonths,
  buildEvolution,
  closedMonths,
  lastDay,
  monthlyResults,
  PROJECTION_MONTHS,
} from "@/lib/evolucion";
import type { Account } from "@/lib/types";
import { Group, groupRow, SectionTitle } from "@/components/ios";
import { PatrimonioChart } from "@/components/patrimonio-chart";

const monthName = new Intl.DateTimeFormat("es-ES", { month: "long", timeZone: "UTC" });
const nameOf = (m: string) => {
  const s = monthName.format(new Date(`${m}-01T00:00:00Z`));
  return s[0].toUpperCase() + s.slice(1);
};
const shortOf = (m: string) =>
  new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" })
    .format(new Date(`${m}-01T00:00:00Z`))
    .replace(".", "");

// Patrimonio a fin de cada mes (con el mismo cálculo que el total de arriba),
// más la proyección de los próximos meses con el resultado medio.
export async function Evolucion({
  accounts,
  today,
  hoy,
  fxRate,
  hidden,
}: {
  accounts: Account[];
  today: string;
  hoy: number;
  fxRate: number | null;
  hidden: boolean;
}) {
  const supabase = await createClient();
  const current = today.slice(0, 7);

  const [{ data: firstTx }, { data: firstSnap }] = await Promise.all([
    supabase.from("transactions").select("date").order("date").limit(1).maybeSingle<{ date: string }>(),
    supabase.from("balance_snapshots").select("date").order("date").limit(1).maybeSingle<{ date: string }>(),
  ]);
  const firstDate = [firstTx?.date, firstSnap?.date].filter(Boolean).sort()[0];
  if (!firstDate) return null;

  const closed = closedMonths(firstDate.slice(0, 7), current);
  const avgMonths = averageMonths(closed);
  const eurIds = accounts.filter((a) => a.currency === "EUR").map((a) => a.id);

  const saldosAl = (date: string) => supabase.rpc("saldos_cuentas", { p_hoy: date });
  const [closedSaldos, finDeMesSaldos, { data: txs }] = await Promise.all([
    Promise.all(closed.map((m) => saldosAl(lastDay(m)))),
    saldosAl(lastDay(current)),
    avgMonths.length
      ? supabase
          .from("transactions")
          .select("mes_imputacion, type, amount")
          .gte("mes_imputacion", `${avgMonths[0]}-01`)
          .lte("mes_imputacion", `${avgMonths[avgMonths.length - 1]}-01`)
          .in("type", ["ingreso", "gasto", "devolucion"])
          .in("account_id", eurIds)
          .returns<{ mes_imputacion: string; type: string; amount: number }[]>()
      : Promise.resolve({ data: [] as { mes_imputacion: string; type: string; amount: number }[] }),
  ]);

  // Cierres pasados: USD al cambio guardado con su saldo. Mes actual: cambio del día.
  const totalOf = (saldos: unknown, fx: number | null) =>
    buildPatrimonio(accounts, (saldos ?? []) as SaldoRow[], fx).total;
  const closedTotals = closed.map((m, i) => ({
    month: m,
    total: totalOf(closedSaldos[i].data, null),
  }));
  const finDeMes = totalOf(finDeMesSaldos.data, fxRate);

  const results = monthlyResults(
    (txs ?? []).map((t) => ({ ...t, amount: Number(t.amount) })),
    avgMonths,
  );
  const average = avgMonths.length
    ? [...results.values()].reduce((s, v) => s + v, 0) / avgMonths.length
    : null;

  const points = buildEvolution({
    start: closed[0] ?? current,
    closed: closedTotals,
    current,
    today,
    hoy,
    finDeMes,
    average,
  });

  // Lista por mes: el actual (hasta hoy) y los cierres, del más reciente al más viejo.
  const rows = [
    { key: current, label: `${nameOf(current)} (hasta hoy)`, total: hoy },
    ...[...closedTotals].reverse().map((c) => ({ key: c.month, label: nameOf(c.month), total: c.total })),
  ].map((r, i, all) => ({ ...r, delta: all[i + 1] ? r.total - all[i + 1].total : null }));

  const avgRange =
    avgMonths.length > 1
      ? `${shortOf(avgMonths[0])}–${shortOf(avgMonths[avgMonths.length - 1])}`
      : avgMonths.length
        ? shortOf(avgMonths[0])
        : "";

  return (
    <>
      <SectionTitle>Evolución</SectionTitle>
      <section className="mx-4 flex flex-col gap-2 rounded-xl bg-card px-4 pt-3.5 pb-3">
        <PatrimonioChart points={points} today={today} hidden={hidden} />
      </section>
      <p className="mx-8 mt-1.5 text-[13px] text-muted">
        {average === null
          ? "Todavía no hay meses cerrados para proyectar."
          : `Punteado: proyección a ${PROJECTION_MONTHS} meses con ${
              hidden ? "el resultado medio" : `${average < 0 ? "−" : "+"}${formatEUR(Math.abs(average))}/mes`
            } (media de ingresos − gastos de ${avgRange}). MyInvestor sin rentabilidad.`}
      </p>

      <SectionTitle>Por mes</SectionTitle>
      <Group>
        {rows.map((r) => (
          <div key={r.key} className={groupRow}>
            <div className="text-[17px]">{r.label}</div>
            <div className="flex flex-col items-end">
              <div className="text-[17px]">{money(r.total, hidden)}</div>
              {r.delta !== null && (
                <div className={`text-[13px] ${r.delta < 0 ? "text-negative" : "text-accent"}`}>
                  {money(Math.abs(r.delta), hidden, r.delta < 0 ? "−" : "+")}
                </div>
              )}
            </div>
          </div>
        ))}
      </Group>
    </>
  );
}
