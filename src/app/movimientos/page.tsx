import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate, todayISO } from "@/lib/format";
import { generarRecurrentes } from "@/lib/generate";
import { isHidden, money } from "@/lib/hidden";
import { addMonths, isMonth } from "@/lib/month";
import { groupMovements, signedAmount, type Filter } from "@/lib/movements";
import type { Account, Category, Transaction } from "@/lib/types";
import { BottomNav } from "@/components/bottom-nav";
import { EyeToggle } from "@/components/eye-toggle";
import { Chevron, Group, groupRow, LargeTitle, SectionTitle } from "@/components/ios";
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
      <Link href={`/movimientos/${t.id}`} className={groupRow}>
        <div className="min-w-0 grow">
          <div className="truncate text-[17px]">
            {showDate && <span className="mr-1.5 text-muted">{formatShortDate(t.date)}</span>}
            {title}
            {t.recurring_id && <span className="ml-1 text-muted" title="Recurrente">↻</span>}
          </div>
          <div className="truncate text-[13px] text-muted">
            {pending && <span className="mr-1 text-accent">Pendiente ·</span>}
            {detail}
          </div>
        </div>
        <div className={`shrink-0 text-[17px] ${s > 0 ? "text-accent" : ""} ${pending ? "text-muted" : ""}`}>
          {money(t.amount, hidden, sign)}
        </div>
        <Chevron />
      </Link>
    );
  }

  const empty = days.length === 0 && flex.items.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-32 tabular-nums">
      <LargeTitle title="Movimientos" actions={<EyeToggle hidden={hidden} />}>
        <MonthNav basePath="/movimientos" month={month} currentMonth={currentMonth} extra={extra} />
      </LargeTitle>

      <div className="flex flex-col gap-3 px-4 pt-1">
        <form action="/movimientos" className="relative flex">
          <input type="hidden" name="mes" value={month} />
          {filter !== "todos" && <input type="hidden" name="tipo" value={filter} />}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="20" y1="20" x2="16.5" y2="16.5" />
          </svg>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre o categoría"
            aria-label="Buscar"
            className="h-9 w-full rounded-[10px] bg-segment pr-3 pl-8 text-[17px] outline-none placeholder:text-muted"
          />
        </form>
        <nav
          aria-label="Filtrar por tipo"
          className="grid grid-cols-4 gap-0.5 rounded-[9px] bg-segment p-0.5"
        >
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={qs({ tipo: f.value })}
              aria-current={filter === f.value ? "true" : undefined}
              className={`flex h-[30px] items-center justify-center rounded-[7px] text-[13px] ${
                filter === f.value
                  ? "bg-segment-on font-semibold shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]"
                  : "font-medium"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </div>

      {empty && (
        <p className="mx-8 mt-6 text-[15px] text-muted">
          {query || filter !== "todos"
            ? "No hay movimientos con ese filtro."
            : "No hay movimientos este mes."}
        </p>
      )}

      {days.map((d) => (
        <div key={d.date}>
          <SectionTitle
            right={d.total !== 0 && money(Math.abs(d.total), hidden, d.total > 0 ? "+" : "−")}
          >
            {dayLabel(d.date, today)}
            {d.date > today && " (pendiente)"}
          </SectionTitle>
          <Group>
            {d.items.map((t) => (
              <Row key={t.id} t={t} />
            ))}
          </Group>
        </div>
      ))}

      {flex.items.length > 0 && (
        <div>
          <SectionTitle right={money(Math.abs(flex.total), hidden, flex.total > 0 ? "+" : "−")}>
            Flex descontado en esta nómina
          </SectionTitle>
          <Group>
            {flex.items.map((t) => (
              <Row key={t.id} t={t} showDate />
            ))}
          </Group>
          <p className="mx-8 mt-1.5 text-[13px] text-muted">
            Gastado del {formatShortDate(`${addMonths(month, -2)}-20`)} al{" "}
            {formatShortDate(`${addMonths(month, -1)}-19`)}
          </p>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
