import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate, todayISO } from "@/lib/format";
import { generarRecurrentes } from "@/lib/generate";
import { isHidden, money } from "@/lib/hidden";
import { addMonths, isMonth } from "@/lib/month";
import { groupMovements, signedAmount, type Filter } from "@/lib/movements";
import type { Account, Category, Transaction } from "@/lib/types";
import { BottomNav } from "@/components/bottom-nav";
import { MonthNav } from "@/components/month-nav";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "gastos", label: "Gastos" },
  { value: "ingresos", label: "Ingresos" },
  { value: "transferencias", label: "Transf." },
];

const weekday = new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: "UTC" });

function dayLabel(date: string, today: string) {
  const d = formatShortDate(date).toUpperCase();
  if (date === today) return `HOY · ${d}`;
  const w = weekday.format(new Date(`${date}T00:00:00Z`)).replace(".", "").toUpperCase();
  return `${w} ${d}`;
}

export default async function MovimientosPage({
  searchParams,
}: PageProps<"/movimientos">) {
  const params = await searchParams;
  const today = todayISO();
  const currentMonth = today.slice(0, 7);
  const month = isMonth(typeof params.mes === "string" ? params.mes : undefined)
    ? (params.mes as string)
    : currentMonth;
  const query = typeof params.q === "string" ? params.q : "";
  const filter: Filter = FILTERS.some((f) => f.value === params.tipo)
    ? (params.tipo as Filter)
    : "todos";
  const hidden = await isHidden();

  const supabase = await createClient();
  await generarRecurrentes(supabase);
  const [{ data: txs }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, account_id, to_account_id, date, mes_imputacion, amount, type, category_id, name, recurring_id, related_id")
      .eq("mes_imputacion", `${month}-01`)
      .returns<Transaction[]>(),
    supabase.from("accounts").select("id, name").returns<Pick<Account, "id" | "name">[]>(),
    supabase
      .from("categories")
      .select("id, name, parent_id, cycle_limit")
      .returns<Pick<Category, "id" | "name" | "parent_id" | "cycle_limit">[]>(),
  ]);

  const accountName = new Map(accounts?.map((a) => [a.id, a.name]));
  const catById = new Map(categories?.map((c) => [c.id, c]));
  const { days, flex } = groupMovements({
    txs: (txs ?? []).map((t) => ({ ...t, amount: Number(t.amount) })),
    categories: categories ?? [],
    query,
    filter,
  });

  const qs = (p: { tipo?: Filter; q?: string }) => {
    const s = new URLSearchParams({ mes: month });
    const tipo = p.tipo ?? filter;
    const q = p.q ?? query;
    if (tipo !== "todos") s.set("tipo", tipo);
    if (q) s.set("q", q);
    return `/movimientos?${s}`;
  };
  const extra = `${filter !== "todos" ? `&tipo=${filter}` : ""}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  function Row({ t, showDate = false }: { t: Transaction; showDate?: boolean }) {
    const cat = t.category_id ? catById.get(t.category_id) : undefined;
    const parent = cat?.parent_id ? catById.get(cat.parent_id) : undefined;
    const catLabel = parent ? `${parent.name} › ${cat!.name}` : (cat?.name ?? "");
    const title =
      t.name ||
      cat?.name ||
      (t.type === "transferencia" ? "Transferencia" : t.type === "saldo_inicial" ? "Ajuste de saldo" : "");
    const detail =
      t.type === "transferencia"
        ? `${accountName.get(t.account_id)} → ${accountName.get(t.to_account_id ?? "")}`
        : [catLabel, accountName.get(t.account_id)].filter(Boolean).join(" · ");
    const s = signedAmount(t);
    const sign = s > 0 ? "+" : s < 0 ? "−" : "";
    const pending = t.date > today;
    return (
      <Link
        href={`/movimientos/${t.id}`}
        className="flex items-center justify-between gap-3 border-b border-line-soft py-3 last:border-b-0"
      >
        <div className="min-w-0">
          <div className="truncate text-[15px]">
            {showDate && <span className="mr-1.5 text-muted">{formatShortDate(t.date)}</span>}
            {title}
            {t.recurring_id && <span className="ml-1 text-muted" title="Recurrente">↻</span>}
          </div>
          <div className="truncate text-[13px] text-muted">
            {pending && <span className="mr-1 text-accent">Pendiente ·</span>}
            {detail}
          </div>
        </div>
        <div className={`shrink-0 text-[15px] ${s > 0 ? "text-accent" : ""} ${pending ? "text-muted" : ""}`}>
          {money(t.amount, hidden, sign)}
        </div>
      </Link>
    );
  }

  const empty = days.length === 0 && flex.items.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-32 tabular-nums">
      <header className="flex justify-center px-3 pt-[max(env(safe-area-inset-top),16px)] pb-2">
        <MonthNav basePath="/movimientos" month={month} currentMonth={currentMonth} extra={extra} />
      </header>

      <div className="flex flex-col gap-3 px-5 pt-2">
        <form action="/movimientos" className="flex">
          <input type="hidden" name="mes" value={month} />
          {filter !== "todos" && <input type="hidden" name="tipo" value={filter} />}
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre o categoría"
            aria-label="Buscar"
            className="h-11 w-full rounded-xl border border-line bg-white px-3.5 text-base outline-none focus:border-accent"
          />
        </form>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={qs({ tipo: f.value })}
              aria-current={filter === f.value ? "true" : undefined}
              className={`flex h-9 items-center rounded-full border px-3.5 text-sm ${
                filter === f.value
                  ? "border-foreground bg-foreground text-white"
                  : "border-line bg-white text-foreground"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 pt-5">
        {empty && (
          <p className="text-muted">
            {query || filter !== "todos"
              ? "No hay movimientos con ese filtro."
              : "No hay movimientos este mes."}
          </p>
        )}

        {days.map((d) => (
          <section key={d.date} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-xs font-medium tracking-wide text-muted">
              <h2>
                {dayLabel(d.date, today)}
                {d.date > today && " (pendiente)"}
              </h2>
              {d.total !== 0 && <span>{money(Math.abs(d.total), hidden, d.total > 0 ? "+" : "−")}</span>}
            </div>
            <div className="flex flex-col rounded-2xl bg-white px-4">
              {d.items.map((t) => (
                <Row key={t.id} t={t} />
              ))}
            </div>
          </section>
        ))}

        {flex.items.length > 0 && (
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-xs font-medium tracking-wide text-muted">
              <h2>FLEX DESCONTADO EN ESTA NÓMINA</h2>
              <span>{money(Math.abs(flex.total), hidden, flex.total > 0 ? "+" : "−")}</span>
            </div>
            <p className="-mt-1 text-xs text-muted">
              Gastado del {formatShortDate(`${addMonths(month, -2)}-20`)} al{" "}
              {formatShortDate(`${addMonths(month, -1)}-19`)}
            </p>
            <div className="flex flex-col rounded-2xl bg-white px-4">
              {flex.items.map((t) => (
                <Row key={t.id} t={t} showDate />
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
