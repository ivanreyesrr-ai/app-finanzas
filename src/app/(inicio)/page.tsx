import { createClient } from "@/lib/supabase/server";
import { formatShortDate, todayISO } from "@/lib/format";
import { isHidden, money } from "@/lib/hidden";
import { mesImputacion } from "@/lib/flex";
import { generarRecurrentes } from "@/lib/generate";
import {
  addMonths,
  isMonth,
  netForAccount,
  prevMonthName,
  summarizeMonth,
} from "@/lib/month";
import { projectRecurring, type Recurring } from "@/lib/recurring";
import { lastDay } from "@/lib/evolucion";
import type { Account, Category, Transaction } from "@/lib/types";
import { BottomNav } from "@/components/bottom-nav";
import { EyeToggle } from "@/components/eye-toggle";
import { MonthNav } from "@/components/month-nav";
import { Group, groupRow, LargeTitle, RoundButton, SectionTitle } from "@/components/ios";

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
  // Gasto diario disponible: resultado del mes (ingresos − gastos − pendientes)
  // repartido entre los días que quedan, hoy incluido.
  const diasRestantes = Number(lastDay(month).slice(8, 10)) - Number(today.slice(8, 10)) + 1;
  const maxCat = Math.max(...s.categories.map((c) => c.paid + c.pending), 1);
  const totalCat = s.categories.reduce((sum, c) => sum + c.paid + c.pending, 0);
  const pct = (n: number) => `${Math.max(0, (n / maxCat) * 100).toFixed(2)}%`;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-32 tabular-nums">
      <LargeTitle
        title="Inicio"
        actions={
          <>
            <EyeToggle hidden={hidden} />
            <RoundButton href="/cuenta" label="Mi cuenta">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="8" r="4.2" />
                <path d="M3.5 21c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5z" />
              </svg>
            </RoundButton>
          </>
        }
      >
        <MonthNav basePath="/" month={month} currentMonth={today.slice(0, 7)} />
      </LargeTitle>

      {genError && (
        <p role="alert" className="mx-4 mb-2 rounded-xl bg-negative/10 p-3 text-sm text-negative">
          No se pudieron generar los recurrentes del mes. ¿Aplicaste la migración
          20260927000005_generar_recurrentes.sql? ({genError.message})
        </p>
      )}

      {saldoError && (
        <p role="alert" className="mx-4 mb-2 rounded-xl bg-negative/10 p-3 text-sm text-negative">
          No se pudo calcular el saldo del mes anterior. ¿Aplicaste la migración
          20260927000004_saldo_antes_de_mes.sql? ({saldoError.message})
        </p>
      )}

      <section className="mx-4 mt-2 flex flex-col gap-1 rounded-xl bg-card px-4 pt-[18px] pb-4">
        <div className="text-[15px] text-muted">
          {isPast ? "Terminó el mes con" : "Te queda a fin de mes"}
        </div>
        <div
          className={`font-serif text-[58px] leading-[1.02] ${s.queda < 0 ? "text-negative" : "text-accent"}`}
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
        {isCurrent && (
          <div className="mt-2 border-t-[0.5px] border-line pt-2.5 text-[15px]">
            {s.resultado >= 0 ? (
              <>
                <span className="font-semibold">≈ {m(s.resultado / diasRestantes)}/día</span>
                <span className="text-muted">
                  {" "}
                  durante {diasRestantes} {diasRestantes === 1 ? "día" : "días"} para cerrar el mes en cero
                </span>
              </>
            ) : (
              <span className="text-negative">
                Este mes ya gastaste más de lo que entra
                {!hidden && ` (${m(Math.abs(s.resultado), "−")})`}
              </span>
            )}
          </div>
        )}
      </section>

      <SectionTitle>Resumen</SectionTitle>
      <Group>
        <Row
          label="Resultado del mes"
          sub={`Ingresos − gastos${s.pendientes > 0 ? ", con los pendientes" : ""}`}
          value={m(Math.abs(s.resultado), s.resultado < 0 ? "−" : "+")}
          className={`font-semibold ${s.resultado < 0 ? "text-negative" : "text-accent"}`}
        />
        <Row label={`Saldo de ${prevMonthName(month)}`} value={m(saldoAnterior)} />
        <Row label="Ingresos" value={m(s.ingresos, "+")} className="text-accent" />
        <Row
          label={isCurrent ? "Gastado hasta hoy" : "Gastado"}
          value={m(s.gastado, "−")}
        />
        <Row
          label="Recurrentes pendientes"
          value={m(s.pendientes, "−")}
          className="text-muted"
        />
        {s.transferencias !== 0 && (
          <Row
            label="Transferencias"
            value={m(Math.abs(s.transferencias), s.transferencias > 0 ? "+" : "−")}
          />
        )}
        {s.ajustes !== 0 && (
          <Row
            label="Ajustes de saldo"
            value={m(Math.abs(s.ajustes), s.ajustes > 0 ? "+" : "−")}
            className="text-muted"
          />
        )}
      </Group>

      <SectionTitle right={`Total ${m(totalCat)}`}>Por categoría</SectionTitle>
      {s.categories.length ? (
        <Group>
          {s.categories.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-[7px] border-b-[0.5px] border-line py-[11px] pr-4 last:border-b-0"
            >
              <div className="flex items-baseline justify-between gap-2 text-[17px]">
                <div>{c.name}</div>
                <div className="text-muted">{m(c.paid + c.pending)}</div>
              </div>
              <div className="flex h-[5px] overflow-hidden rounded-full bg-track">
                <div className="bg-accent" style={{ width: pct(c.paid) }} />
                <div
                  style={{
                    width: pct(c.pending),
                    background:
                      "repeating-linear-gradient(45deg, var(--accent) 0 2px, var(--track) 2px 5px)",
                  }}
                />
              </div>
              {c.pendingItems.length > 0 && (
                <div className="text-[13px] text-muted">
                  {c.pendingItems
                    .map((p) => (hidden ? p.name : `${p.name} ${m(p.amount)}`))
                    .join(", ")}{" "}
                  pendiente
                </div>
              )}
            </div>
          ))}
        </Group>
      ) : (
        <p className="mx-8 text-[15px] text-muted">Sin gastos este mes.</p>
      )}

      {s.upcoming.length > 0 && (
        <>
          <SectionTitle>Pendientes del mes</SectionTitle>
          <Group>
            {s.upcoming.map((p, i) => (
              <div
                key={i}
                className="flex min-h-14 items-center gap-3 border-b-[0.5px] border-line pr-4 last:border-b-0"
              >
                <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[7px] bg-accent text-on-accent">
                  {p.recurring ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="Recurrente">
                      <polyline points="17 1 21 5 17 9" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <line x1="8" y1="3" x2="8" y2="7" />
                      <line x1="16" y1="3" x2="16" y2="7" />
                    </svg>
                  )}
                </div>
                <div className="flex grow flex-col">
                  <div className="text-[17px]">{p.name}</div>
                  <div className="text-[13px] text-muted">{formatShortDate(p.date)}</div>
                </div>
                <div className="text-[17px] text-muted">{m(p.amount, "−")}</div>
              </div>
            ))}
          </Group>
        </>
      )}

      <BottomNav />
    </main>
  );
}

function Row({
  label,
  sub,
  value,
  className = "",
}: {
  label: string;
  sub?: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={groupRow}>
      <div className="flex flex-col">
        <div className="text-[17px]">{label}</div>
        {sub && <div className="text-[13px] text-muted">{sub}</div>}
      </div>
      <div className={`text-[17px] ${className}`}>{value}</div>
    </div>
  );
}
