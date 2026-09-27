import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate, todayISO } from "@/lib/format";
import { isHidden, money } from "@/lib/hidden";
import { mesImputacion } from "@/lib/flex";
import { generarRecurrentes } from "@/lib/generate";
import {
  addMonths,
  isMonth,
  monthLabel,
  netForAccount,
  prevMonthName,
  summarizeMonth,
} from "@/lib/month";
import { projectRecurring, type Recurring } from "@/lib/recurring";
import type { Account, Category, Transaction } from "@/lib/types";
import { BottomNav } from "@/components/bottom-nav";
import { EyeToggle } from "@/components/eye-toggle";

const chevron = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export default async function InicioMes({ searchParams }: PageProps<"/">) {
  const { mes } = await searchParams;
  const today = todayISO();
  const month = isMonth(typeof mes === "string" ? mes : undefined)
    ? (mes as string)
    : today.slice(0, 7);
  const hidden = await isHidden();
  const m = (n: number, sign: "" | "+" | "−" = "") => money(n, hidden, sign);

  const supabase = await createClient();
  const genError = await generarRecurrentes(supabase);

  const [{ data: accounts }, { data: categories }, { data: txs }, { data: recurring }] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name, currency, is_daily")
        .returns<Pick<Account, "id" | "name" | "currency" | "is_daily">[]>(),
      supabase
        .from("categories")
        .select("id, name, parent_id, sort, cycle_limit")
        .returns<Pick<Category, "id" | "name" | "parent_id" | "sort" | "cycle_limit">[]>(),
      supabase
        .from("transactions")
        .select("id, account_id, to_account_id, date, mes_imputacion, amount, type, category_id, name, recurring_id")
        .eq("mes_imputacion", `${month}-01`)
        .returns<Transaction[]>(),
      supabase.from("recurring").select("*").eq("active", true).returns<Recurring[]>(),
    ]);

  const daily = accounts?.find((a) => a.is_daily);
  const { data: saldo, error: saldoError } = daily
    ? await supabase.rpc("saldo_antes_de_mes", {
        p_account_id: daily.id,
        p_mes: `${month}-01`,
      })
    : { data: 0, error: null };

  // Meses futuros: los recurrentes todavía no generados se proyectan (sin guardarse).
  // Los que caen en meses intermedios ajustan el saldo anterior.
  const currentMonth = today.slice(0, 7);
  const futureMonths: string[] = [];
  for (let mm = addMonths(currentMonth, 1); mm <= month; mm = addMonths(mm, 1))
    futureMonths.push(mm);
  const flexIds = new Set(
    categories?.filter((c) => c.cycle_limit !== null).map((c) => c.id),
  );
  const projected = projectRecurring(
    (recurring ?? []).map((r) => ({ ...r, amount: Number(r.amount) })),
    futureMonths,
    (t) => mesImputacion(t.date, !!t.category_id && flexIds.has(t.category_id)),
  );
  const saldoAnterior =
    Number(saldo ?? 0) +
    netForAccount(
      projected.filter((t) => t.mes_imputacion < `${month}-01`),
      daily?.id ?? "",
    );

  const s = summarizeMonth({
    txs: [
      ...(txs ?? []).map((t) => ({ ...t, amount: Number(t.amount) })),
      ...projected.filter((t) => t.mes_imputacion === `${month}-01`),
    ],
    accounts: accounts ?? [],
    categories: categories ?? [],
    dailyId: daily?.id ?? "",
    saldoAnterior,
    today,
  });

  const isCurrent = month === today.slice(0, 7);
  const isPast = month < today.slice(0, 7);
  const maxCat = Math.max(...s.categories.map((c) => c.paid + c.pending), 1);
  const totalCat = s.categories.reduce((sum, c) => sum + c.paid + c.pending, 0);
  const pct = (n: number) => `${Math.max(0, (n / maxCat) * 100).toFixed(2)}%`;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-32 tabular-nums">
      <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center px-3 pt-[max(env(safe-area-inset-top),16px)] pb-2">
        <Link
          href="/cuenta"
          aria-label="Mi cuenta"
          className="flex size-11 items-center justify-center rounded-full"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </Link>
        <div className="flex items-center justify-center gap-1">
          <Link
            href={`/?mes=${addMonths(month, -1)}`}
            aria-label="Mes anterior"
            className="flex size-11 items-center justify-center rounded-full"
          >
            <svg {...chevron}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <Link
            href="/"
            className={`text-[17px] font-semibold ${isCurrent ? "" : "underline decoration-line underline-offset-4"}`}
            aria-label={isCurrent ? undefined : "Volver al mes actual"}
          >
            {monthLabel(month)}
          </Link>
          <Link
            href={`/?mes=${addMonths(month, 1)}`}
            aria-label="Mes siguiente"
            className="flex size-11 items-center justify-center rounded-full"
          >
            <svg {...chevron}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
        <EyeToggle hidden={hidden} />
      </header>

      {genError && (
        <p role="alert" className="mx-5 mb-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          No se pudieron generar los recurrentes del mes. ¿Aplicaste la migración
          20260927000005_generar_recurrentes.sql? ({genError.message})
        </p>
      )}

      {saldoError && (
        <p role="alert" className="mx-5 mb-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          No se pudo calcular el saldo del mes anterior. ¿Aplicaste la migración
          20260927000004_saldo_antes_de_mes.sql? ({saldoError.message})
        </p>
      )}

      <section className="flex flex-col gap-1 px-5 pt-3 pb-5">
        <div className="text-sm text-muted">
          {isPast ? "Terminó el mes con" : "Te queda a fin de mes"}
        </div>
        <div
          className={`font-serif text-[64px] leading-none ${s.queda < 0 ? "text-red-700" : "text-accent"}`}
        >
          {m(s.queda)}
        </div>
        <div className="text-[13px] text-muted">
          {daily?.name ?? "Sin cuenta diaria"}
          {s.pendientes > 0 &&
            (hidden
              ? " · ya descontados los recurrentes pendientes"
              : ` · ya descontados ${m(s.pendientes)} de recurrentes pendientes`)}
        </div>
      </section>

      <section className="mx-5 grid grid-cols-2 gap-3.5 rounded-2xl bg-white p-4">
        <Stat label={`Saldo de ${prevMonthName(month)}`} value={m(saldoAnterior)} />
        <Stat label="Ingresos" value={m(s.ingresos, "+")} className="text-accent" />
        <Stat
          label={isCurrent ? "Gastado hasta hoy" : "Gastado"}
          value={m(s.gastado, "−")}
        />
        <Stat
          label="Recurrentes pendientes"
          value={m(s.pendientes, "−")}
          className="text-muted"
        />
        {s.transferencias !== 0 && (
          <Stat
            label="Transferencias"
            value={m(Math.abs(s.transferencias), s.transferencias > 0 ? "+" : "−")}
          />
        )}
      </section>

      <section className="flex flex-col gap-3 px-5 pt-6 pb-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold">Por categoría</h2>
          <div className="text-xs text-muted">Total {m(totalCat)}</div>
        </div>
        {s.categories.length ? (
          <div className="flex flex-col rounded-2xl bg-white px-4 py-1">
            {s.categories.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-1.5 border-b border-line-soft py-3 last:border-b-0"
              >
                <div className="flex items-baseline justify-between gap-2 text-[15px] font-medium">
                  <div>{c.name}</div>
                  <div>{m(c.paid + c.pending)}</div>
                </div>
                <div className="flex h-1.5 overflow-hidden rounded-full bg-line-soft">
                  <div className="bg-accent" style={{ width: pct(c.paid) }} />
                  <div
                    style={{
                      width: pct(c.pending),
                      background:
                        "repeating-linear-gradient(45deg, var(--accent) 0 2px, var(--line-soft) 2px 5px)",
                    }}
                  />
                </div>
                {c.pendingItems.length > 0 && (
                  <div className="text-xs text-muted">
                    {c.pendingItems
                      .map((p) => (hidden ? p.name : `${p.name} ${m(p.amount)}`))
                      .join(", ")}{" "}
                    pendiente
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Sin gastos este mes.</p>
        )}
      </section>

      {s.upcoming.length > 0 && (
        <section className="flex flex-col gap-3 px-5 pt-4 pb-2">
          <h2 className="text-[17px] font-semibold">Pendientes del mes</h2>
          <div className="flex flex-col rounded-2xl bg-white px-4 py-1">
            {s.upcoming.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-line-soft py-3 last:border-b-0"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="text-[15px]">{p.name}{p.recurring && <span className="ml-1 text-muted" title="Recurrente">↻</span>}</div>
                  <div className="text-xs text-muted">{formatShortDate(p.date)}</div>
                </div>
                <div className="text-[15px] text-muted">{m(p.amount, "−")}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <BottomNav />
    </main>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-[17px] font-semibold ${className}`}>{value}</div>
    </div>
  );
}
