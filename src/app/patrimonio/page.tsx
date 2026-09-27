import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate, todayISO } from "@/lib/format";
import { usdToEur } from "@/lib/fx";
import { isHidden, money } from "@/lib/hidden";
import { buildPatrimonio, type SaldoRow } from "@/lib/patrimonio";
import type { Account } from "@/lib/types";
import { BottomNav } from "@/components/bottom-nav";
import { EyeToggle } from "@/components/eye-toggle";

const pctFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default async function PatrimonioPage() {
  const supabase = await createClient();
  const hidden = await isHidden();

  const [{ data: accounts }, { data: saldos, error }, fx] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type, currency, is_daily, sort")
      .order("sort")
      .returns<Account[]>(),
    supabase.rpc("saldos_cuentas", { p_hoy: todayISO() }),
    usdToEur(),
  ]);

  const { rows, total, missingFx } = buildPatrimonio(
    accounts ?? [],
    (saldos ?? []) as SaldoRow[],
    fx?.rate ?? null,
  );
  const hasUsd = rows.some((r) => r.currency === "USD");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-32 tabular-nums">
      <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center px-3 pt-[max(env(safe-area-inset-top),16px)] pb-2">
        <div />
        <h1 className="text-center text-[17px] font-semibold">Patrimonio</h1>
        <EyeToggle hidden={hidden} />
      </header>

      {error && (
        <p role="alert" className="mx-5 mb-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          No se pudieron calcular los saldos. ¿Aplicaste la migración
          20260927000006_saldos_cuentas.sql? ({error.message})
        </p>
      )}

      <section className="flex flex-col gap-1 px-5 pt-4 pb-5">
        <div className="text-sm text-muted">Total</div>
        <div className="font-serif text-[60px] leading-none">{money(total, hidden)}</div>
        {hasUsd && (
          <div className="text-[13px] text-muted">
            {fx
              ? `USD a EUR al cambio del BCE del ${formatShortDate(fx.date)}: 1 USD = ${fx.rate.toFixed(4).replace(".", ",")} €`
              : missingFx
                ? "Sin cambio USD→EUR disponible: el efectivo en USD no suma al total"
                : "USD convertido a EUR con el último cambio guardado"}
          </div>
        )}
      </section>

      <section className="px-5">
        <div
          aria-label="Reparto del patrimonio"
          className="flex h-3.5 gap-0.5 overflow-hidden rounded-full"
        >
          {rows
            .filter((r) => r.pct)
            .map((r) => (
              <div key={r.id} style={{ width: `${r.pct}%`, background: r.color }} />
            ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 px-5 pt-5">
        <div className="flex flex-col rounded-2xl bg-white px-4 py-1">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 border-b border-line-soft py-3.5 last:border-b-0"
            >
              <div className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
              <div className="flex min-w-0 grow flex-col gap-0.5">
                <div className="text-[15px] font-medium">{r.name}</div>
                <div className="truncate text-xs text-muted">
                  {r.role}
                  {r.manual && (r.updated ? ` · actualizado ${formatShortDate(r.updated)}` : " · sin saldo cargado")}
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <div className="text-[15px] font-medium">
                  {r.eur === null ? "—" : money(r.eur, hidden)}
                </div>
                <div className="text-xs text-muted">
                  {r.currency === "USD" && !hidden
                    ? `${new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD", useGrouping: "always" }).format(r.balance)}`
                    : r.pct !== null
                      ? `${pctFormat.format(r.pct)} %`
                      : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="text-[13px] text-muted">
            Santander sale de los movimientos; el resto se actualiza a mano
          </div>
          <Link
            href="/patrimonio/actualizar"
            className="flex h-11 shrink-0 items-center rounded-xl border border-line bg-white px-3.5 text-sm"
          >
            Actualizar saldo
          </Link>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
