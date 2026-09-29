"use client";

import { useActionState, useState } from "react";
import { formatEUR, formatShortDate } from "@/lib/format";
import type { Account } from "@/lib/types";
import { Chip } from "@/components/chip";
import { SectionLabel, SheetHeader } from "@/components/ios";
import { saveSnapshot } from "../actions";

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

      <SheetHeader
        title="Actualizar saldo"
        cancelHref="/patrimonio"
        saving={pending}
        disabled={!accountId}
      />

      <div className="flex flex-col gap-[18px] px-4 pt-2 pb-6">
        <div className="flex flex-col gap-2">
          <SectionLabel>Cuenta</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <Chip key={a.id} on={accountId === a.id} onClick={() => setAccountId(a.id)}>
                {a.name}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-0.5 pt-1.5 pb-0.5">
          <div className="flex items-baseline justify-center font-serif text-[64px] leading-[1.05]">
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
          <label htmlFor="balance" className="text-[13px] text-muted">
            Saldo actual
          </label>
          {isUsd && (
            <p className="text-[13px] text-muted">
              {fxRate
                ? value !== null
                  ? `≈ ${formatEUR(value * fxRate)} al cambio del día`
                  : `1 USD = ${fxRate.toFixed(4).replace(".", ",")} €`
                : "Sin cambio del día disponible: se usará el último guardado"}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="rounded-[10px] bg-card pl-4">
            <div className="relative flex min-h-11 items-center justify-between gap-3 pr-4 text-[17px]">
              <label htmlFor="date">Fecha del saldo</label>
              <span className="rounded-[7px] bg-fill px-2.5 py-1 text-accent">
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
          <p className="mx-4 text-[13px] text-muted">
            Los movimientos de esta cuenta con fecha posterior se suman a este saldo
            hasta la próxima actualización.
          </p>
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
