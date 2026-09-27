"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { formatEUR, formatShortDate } from "@/lib/format";
import type { Account, Transaction } from "@/lib/types";
import { createDevolucion } from "../../actions";

const rowSelect = "absolute inset-0 w-full cursor-pointer opacity-0";

export function DevolucionForm({
  original,
  accounts,
  today,
}: {
  original: Transaction;
  accounts: Account[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState(createDevolucion, null);
  const [amount, setAmount] = useState(original.amount.toFixed(2).replace(".", ","));
  const [date, setDate] = useState(today);
  const [accountId, setAccountId] = useState(original.account_id);
  const accountName = accounts.find((a) => a.id === accountId)?.name ?? "—";

  return (
    <form action={formAction} className="mx-auto flex min-h-dvh w-full max-w-md flex-col tabular-nums">
      <input type="hidden" name="related_id" value={original.id} />

      <header className="flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top),16px)]">
        <Link
          href={`/movimientos/${original.id}`}
          aria-label="Cerrar"
          className="flex size-11 items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </Link>
        <h1 className="text-[17px] font-semibold">Registrar devolución</h1>
        <div className="size-11" />
      </header>

      <div className="flex flex-col gap-5 px-5 pt-4">
        <p className="text-sm text-muted">
          De <span className="text-foreground">{original.name || "gasto"}</span> ·{" "}
          {formatEUR(original.amount)} el {formatShortDate(original.date)}
        </p>

        <div className="flex flex-col items-center gap-1 py-2">
          <label htmlFor="amount" className="text-[13px] text-muted">
            Importe devuelto
          </label>
          <div className="flex items-baseline justify-center font-serif text-[60px] leading-tight">
            <input
              id="amount"
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              style={{ width: `${Math.max(amount.length, 4) * 0.55}em` }}
              className="bg-transparent text-right outline-none"
            />
            <span className="ml-2">€</span>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl bg-white px-4">
          <div className="relative flex h-12 items-center justify-between border-b border-line-soft">
            <label htmlFor="date" className="text-[15px]">
              Fecha
            </label>
            <span className="text-[15px] text-muted">
              {date === today ? `Hoy, ${formatShortDate(date)}` : formatShortDate(date)}
            </span>
            <input
              id="date"
              name="date"
              type="date"
              required
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className={rowSelect}
            />
          </div>
          <div className="relative flex h-12 items-center justify-between">
            <label htmlFor="account_id" className="text-[15px]">
              Cuenta
            </label>
            <span className="text-[15px] text-muted">{accountName}</span>
            <select
              id="account_id"
              name="account_id"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className={rowSelect}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {state?.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}
      </div>

      <div className="mt-auto px-5 pt-4 pb-[max(env(safe-area-inset-bottom),20px)]">
        <button
          disabled={pending}
          className="h-[52px] w-full rounded-[14px] bg-accent text-base font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar devolución"}
        </button>
      </div>
    </form>
  );
}
