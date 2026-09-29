"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { formatEUR, formatShortDate } from "@/lib/format";
import type { Account } from "@/lib/types";
import { Chip } from "@/components/chip";
import { saveSnapshot } from "../actions";

const label = "text-[13px] text-muted";

function parse(input: string) {
  let s = input.replace(/\s/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return s && Number.isFinite(n) ? n : null;
}

export function ActualizarForm({
  accounts,
  today,
  fxRate,
}: {
  accounts: Account[];
  today: string;
  fxRate: number | null;
}) {
  const [state, formAction, pending] = useActionState(saveSnapshot, null);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [balance, setBalance] = useState("");
  const [date, setDate] = useState(today);

  const account = accounts.find((a) => a.id === accountId);
  const isUsd = account?.currency === "USD";
  const value = parse(balance);

  return (
    <form
      action={formAction}
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col tabular-nums"
    >
      <input type="hidden" name="account_id" value={accountId} />
      <input type="hidden" name="fx_rate" value={isUsd && fxRate ? fxRate : ""} />

      <header className="flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top),16px)]">
        <Link href="/patrimonio" aria-label="Cerrar" className="flex size-11 items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </Link>
        <h1 className="text-[17px] font-semibold">Actualizar saldo</h1>
        <div className="size-11" />
      </header>

      <div className="flex flex-col gap-5 px-5 pt-4">
        <div className="flex flex-col gap-2">
          <div className={label}>Cuenta</div>
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <Chip key={a.id} on={accountId === a.id} onClick={() => setAccountId(a.id)}>
                {a.name}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 py-2">
          <label htmlFor="balance" className={label}>
            Saldo actual
          </label>
          <div className="flex items-baseline justify-center font-serif text-[60px] leading-tight">
            <input
              id="balance"
              name="balance"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              required
              value={balance}
              onChange={(e) => setBalance(e.target.value.replace(/[^\d.,]/g, ""))}
              style={{ width: `${Math.max(balance.length, 4) * 0.55}em` }}
              className="bg-transparent text-right outline-none placeholder:text-foreground/25"
            />
            <span className="ml-2">{isUsd ? "$" : "€"}</span>
          </div>
          {isUsd && (
            <p className="text-sm text-muted">
              {fxRate
                ? value !== null
                  ? `≈ ${formatEUR(value * fxRate)} al cambio del día`
                  : `1 USD = ${fxRate.toFixed(4).replace(".", ",")} €`
                : "Sin cambio del día disponible: se usará el último guardado"}
            </p>
          )}
        </div>

        <div className="flex flex-col rounded-2xl bg-card px-4">
          <div className="relative flex h-12 items-center justify-between">
            <label htmlFor="date" className="text-[15px]">
              Fecha del saldo
            </label>
            <span className="text-[15px] text-muted">
              {date === today ? `Hoy, ${formatShortDate(date)}` : formatShortDate(date)}
            </span>
            <input
              id="date"
              name="date"
              type="date"
              required
              max={today}
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="absolute inset-0 w-full cursor-pointer opacity-0"
            />
          </div>
        </div>

        <p className="text-sm text-muted">
          Los movimientos de esta cuenta con fecha posterior se suman a este saldo
          hasta la próxima actualización.
        </p>

        {state?.error && (
          <p role="alert" className="text-sm text-negative">
            {state.error}
          </p>
        )}
      </div>

      <div className="mt-auto px-5 pt-4 pb-[max(env(safe-area-inset-bottom),20px)]">
        <button
          disabled={pending || !accountId}
          className="h-[52px] w-full rounded-[14px] bg-accent text-base font-semibold text-on-accent disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
