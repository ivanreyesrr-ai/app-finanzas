import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatEUR, formatShortDate } from "@/lib/format";
import type { Account, Category, Transaction } from "@/lib/types";
import { signOut } from "./actions";

// Provisorio hasta el paso 4 (Inicio del mes): últimos movimientos cargados.
export default async function Home() {
  const supabase = await createClient();

  const [{ data: txs }, { data: accounts }, { data: categories }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("id, account_id, to_account_id, date, mes_imputacion, amount, type, category_id, name")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<Transaction[]>(),
      supabase.from("accounts").select("id, name").returns<Pick<Account, "id" | "name">[]>(),
      supabase.from("categories").select("id, name").returns<Pick<Category, "id" | "name">[]>(),
    ]);

  const accountName = new Map(accounts?.map((a) => [a.id, a.name]));
  const categoryName = new Map(categories?.map((c) => [c.id, c.name]));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 pt-[max(env(safe-area-inset-top),24px)] pb-8 tabular-nums">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Últimos movimientos</h1>
        <Link
          href="/cargar"
          aria-label="Cargar movimiento"
          className="flex size-11 items-center justify-center rounded-full bg-accent text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </header>

      {txs?.length ? (
        <ul className="flex flex-col rounded-2xl bg-white px-4">
          {txs.map((t) => {
            const title =
              t.name ||
              (t.category_id ? categoryName.get(t.category_id) : null) ||
              "Transferencia";
            const detail =
              t.type === "transferencia"
                ? `${accountName.get(t.account_id)} → ${accountName.get(t.to_account_id ?? "")}`
                : `${t.category_id ? categoryName.get(t.category_id) : ""} · ${accountName.get(t.account_id)}`;
            const sign = t.type === "ingreso" ? "+" : t.type === "gasto" ? "−" : "";
            return (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 border-b border-line-soft py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-[15px]">{title}</div>
                  <div className="truncate text-[13px] text-muted">
                    {formatShortDate(t.date)} · {detail}
                  </div>
                </div>
                <div
                  className={`shrink-0 text-[15px] ${t.type === "ingreso" ? "text-accent" : ""}`}
                >
                  {sign}
                  {formatEUR(t.amount)}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted">Todavía no cargaste movimientos.</p>
      )}

      <form action={signOut} className="mt-auto">
        <button className="text-sm text-muted underline">Cerrar sesión</button>
      </form>
    </main>
  );
}
