import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate, todayISO } from "@/lib/format";
import { generarRecurrentes } from "@/lib/generate";
import { isHidden, money } from "@/lib/hidden";
import {
  monthlyCommitment,
  nextDate,
  type Frequency,
  type Recurring,
} from "@/lib/recurring";
import type { Account, Category } from "@/lib/types";
import { BottomNav } from "@/components/bottom-nav";

const GROUPS: { freq: Frequency; title: string }[] = [
  { freq: "mensual", title: "Mensuales" },
  { freq: "bimestral", title: "Bimestrales" },
  { freq: "trimestral", title: "Trimestrales" },
  { freq: "anual", title: "Anuales" },
];

export default async function RecurrentesPage() {
  const supabase = await createClient();
  const genError = await generarRecurrentes(supabase);
  const hidden = await isHidden();
  const today = todayISO();

  const [{ data: recurring }, { data: accounts }, { data: categories }] =
    await Promise.all([
      supabase.from("recurring").select("*").order("day_of_month").returns<Recurring[]>(),
      supabase.from("accounts").select("id, name").returns<Pick<Account, "id" | "name">[]>(),
      supabase.from("categories").select("id, name").returns<Pick<Category, "id" | "name">[]>(),
    ]);

  const all = (recurring ?? []).map((r) => ({ ...r, amount: Number(r.amount) }));
  const accountName = new Map(accounts?.map((a) => [a.id, a.name]));
  const categoryName = new Map(categories?.map((c) => [c.id, c.name]));
  const paused = all.filter((r) => !r.active);

  function Row({ r }: { r: Recurring }) {
    const next = r.active ? nextDate(r, today) : null;
    const when =
      r.frequency === "mensual"
        ? `día ${r.day_of_month}`
        : next
          ? formatShortDate(next)
          : "—";
    const detail =
      r.type === "transferencia"
        ? `${accountName.get(r.account_id)} → ${accountName.get(r.to_account_id ?? "")}`
        : `${categoryName.get(r.category_id ?? "") ?? ""} · ${accountName.get(r.account_id)}`;
    const sign = r.type === "ingreso" ? "+" : r.type === "gasto" ? "−" : "";
    return (
      <Link
        href={`/recurrentes/${r.id}`}
        className={`flex items-center justify-between gap-3 border-b border-line-soft py-3 last:border-b-0 ${r.active ? "" : "opacity-50"}`}
      >
        <div className="min-w-0">
          <div className="truncate text-[15px]">
            {r.name || categoryName.get(r.category_id ?? "") || "Transferencia"}
          </div>
          <div className="truncate text-[13px] text-muted">{detail}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <div className={`text-[15px] ${r.type === "ingreso" ? "text-accent" : ""}`}>
            {money(r.amount, hidden, sign)}
          </div>
          <div className="text-[13px] text-muted">{when}</div>
        </div>
      </Link>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 pt-[max(env(safe-area-inset-top),24px)] pb-32 tabular-nums">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Recurrentes</h1>
        <Link
          href="/recurrentes/nuevo"
          className="rounded-full border border-line bg-white px-3.5 py-2 text-sm"
        >
          + Nuevo
        </Link>
      </header>

      {genError && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          No se pudieron generar los recurrentes del mes. ¿Aplicaste la migración
          20260927000005_generar_recurrentes.sql? ({genError.message})
        </p>
      )}

      <p className="-mt-2 text-sm text-muted">
        Comprometido por mes:{" "}
        <span className="text-foreground">{money(monthlyCommitment(all), hidden)}</span>
      </p>

      {all.length === 0 && (
        <p className="text-muted">
          Todavía no tenés recurrentes. Creá uno con “+ Nuevo” o marcando “Repetir
          cada mes” al cargar un movimiento.
        </p>
      )}

      {GROUPS.map(({ freq, title }) => {
        const list = all.filter((r) => r.active && r.frequency === freq);
        if (!list.length) return null;
        return (
          <section key={freq} className="flex flex-col gap-2">
            <h2 className="text-xs font-medium tracking-wide text-muted uppercase">{title}</h2>
            <div className="flex flex-col rounded-2xl bg-white px-4">
              {list.map((r) => (
                <Row key={r.id} r={r} />
              ))}
            </div>
          </section>
        );
      })}

      {paused.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium tracking-wide text-muted uppercase">Pausados</h2>
          <div className="flex flex-col rounded-2xl bg-white px-4">
            {paused.map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </div>
        </section>
      )}

      <BottomNav />
    </main>
  );
}
