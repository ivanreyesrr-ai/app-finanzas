"use client";

import { useActionState, useState } from "react";
import { formatEUR, formatShortDate } from "@/lib/format";
import type { Account, Transaction } from "@/lib/types";
import { SheetHeader } from "@/components/ios";
import { createDevolucion } from "../../actions";

const rowSelect = "absolute inset-0 w-full cursor-pointer opacity-0";
const row =
  "relative flex min-h-11 items-center justify-between gap-3 border-b-[0.5px] border-line pr-4 text-[17px] last:border-b-0";

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

      <SheetHeader
        title="Devolución"
        cancelHref={`/movimientos/${original.id}`}
        saving={pending}
      />

      <div className="flex flex-col gap-[18px] px-4 pt-2 pb-6">
        <p className="ml-4 text-[15px] text-muted">
          De <span className="text-foreground">{original.name || "gasto"}</span> ·{" "}
          {formatEUR(original.amount)} el {formatShortDate(original.date)}
        </p>

        <div className="flex flex-col items-center gap-0.5 pt-1.5 pb-0.5">
          <div className="flex items-baseline justify-center font-serif text-[64px] leading-[1.05]">
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
          <label htmlFor="amount" className="text-[13px] text-muted">
            Importe devuelto
          </label>
        </div>

        <div className="flex flex-col rounded-[10px] bg-card pl-4">
          <div className={row}>
            <label htmlFor="date">Fecha</label>
            <span className="rounded-[7px] bg-fill px-2.5 py-1 text-accent">
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
          <div className={row}>
            <label htmlFor="account_id">Cuenta</label>
            <span className="text-muted">{accountName}</span>
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
          <p role="alert" className="ml-4 text-[15px] text-negative">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
