import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate, todayISO } from "@/lib/format";
import { usdToEur } from "@/lib/fx";
import { isHidden, money } from "@/lib/hidden";
import { buildPatrimonio, type SaldoRow } from "@/lib/patrimonio";
import type { Account } from "@/lib/types";
import { BottomNav } from "@/components/bottom-nav";
import { EyeToggle } from "@/components/eye-toggle";
import { Chevron, Group, groupRow, LargeTitle, SectionTitle } from "@/components/ios";

const pctFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default async function PatrimonioPage() {
  const supabase = await createClient();
  const hidden = await isHidden();

  const [{ data: accounts }, { data: saldos, error }, fx] =
    await Promise.all([
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
      <LargeTitle title="Patrimonio" actions={<EyeToggle hidden={hidden} />} />

      {error && (
        <p role="alert" className="mx-4 mt-2 rounded-xl bg-negative/10 p-3 text-sm text-negative">
          No se pudieron calcular los saldos. ¿Aplicaste la migración
          20260927000006_saldos_cuentas.sql? ({error.message})
        </p>
      )}

      <section className="mx-4 mt-3 flex flex-col gap-1 rounded-xl bg-card px-4 pt-[18px] pb-4">
        <div className="text-[15px] text-muted">Total</div>
        <div className="font-serif text-[58px] leading-[1.02]">{money(total, hidden)}</div>
        {hasUsd && (
          <div className="text-[13px] text-muted">
            {fx
              ? `USD a EUR al cambio del BCE del ${formatShortDate(fx.date)}: 1 USD = ${fx.rate.toFixed(4).replace(".", ",")} €`
              : missingFx
                ? "Sin cambio USD→EUR disponible: el efectivo en USD no suma al total"
                : "USD convertido a EUR con el último cambio guardado"}
          </div>
        )}
        <div
          aria-label="Reparto del patrimonio"
          className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full"
        >
          {rows
            .filter((r) => r.pct)
            .map((r) => (
              <div key={r.id} style={{ width: `${r.pct}%`, background: r.color }} />
            ))}
        </div>
      </section>

      <SectionTitle>Cuentas</SectionTitle>
      <Group>
        {rows.map((r) => (
          <div key={r.id} className={groupRow}>
            <div className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
            <div className="flex min-w-0 grow flex-col">
              <div className="text-[17px]">{r.name}</div>
              <div className="truncate text-[13px] text-muted">
                {r.role}
                {r.manual && (r.updated ? ` · actualizado ${formatShortDate(r.updated)}` : " · sin saldo cargado")}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-[17px]">
                {r.eur === null ? "—" : money(r.eur, hidden)}
              </div>
              <div className="text-[13px] text-muted">
                {r.currency === "USD" && !hidden
                  ? `${new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD", useGrouping: "always" }).format(r.balance)}`
                  : r.pct !== null
                    ? `${pctFormat.format(r.pct)} %`
                    : ""}
              </div>
            </div>
          </div>
        ))}
      </Group>
      <p className="mx-8 mt-1.5 text-[13px] text-muted">
        Santander sale de los movimientos; el resto se actualiza a mano.
      </p>

      <div className="mt-6">
        <Group>
          <Link href="/patrimonio/actualizar" className={groupRow}>
            <span className="text-[17px] text-accent">Actualizar saldo</span>
            <Chevron />
          </Link>
        </Group>
      </div>

      <BottomNav />
    </main>
  );
}
