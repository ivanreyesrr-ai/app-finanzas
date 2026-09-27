import { createClient } from "@/lib/supabase/server";
import { formatShortDate } from "@/lib/format";
import { isHidden, money } from "@/lib/hidden";
import type { Account, Category, Transaction } from "@/lib/types";
import { BottomNav } from "@/components/bottom-nav";
import { signOut } from "../actions";

// Provisorio hasta que se diseñe la pantalla Movimientos: últimos 30 cargados.
export default async function MovimientosPage() {
  const supabase = await createClient();
  const hidden = await isHidden();

  const [{ data: txs }, { data: accounts }, { data: categories }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("id, account_id, to_account_id, date, mes_imputacion, amount, type, category_id, name")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30)
        .returns<Transaction[]>(),
      supabase.from("accounts").select("id, name").returns<Pick<Account, "id" | "name">[]>(),
      supabase.from("categories").select("id, name").returns<Pick<Category, "id" | "name">[]>(),
    ]);

  const accountName = new Map(accounts?.map((a) => [a.id, a.name]));
  const categoryName = new Map(categories?.map((c) => [c.id, c.name]));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 pt-[max(env(safe-area-inset-top),24px)] pb-32 tabular-nums">
      <h1 className="text-2xl font-semibold">Movimientos</h1>

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
                  {money(t.amount, hidden, sign)}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted">Todavía no cargaste movimientos.</p>
      )}

      <form action={signOut}>
        <button className="text-sm text-muted underline">Cerrar sesión</button>
      </form>

      <BottomNav />
    </main>
  );
}
