"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveSaldoInicial } from "../actions";

export default function SaldoInicialPage() {
  const [state, formAction, pending] = useActionState(saveSaldoInicial, null);
  const [balance, setBalance] = useState("");

  return (
    <form action={formAction} className="mx-auto flex min-h-dvh w-full max-w-md flex-col tabular-nums">
      <header className="flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top),16px)]">
        <Link href="/patrimonio" aria-label="Cerrar" className="flex size-11 items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </Link>
        <h1 className="text-[17px] font-semibold">Saldo inicial de Santander</h1>
        <div className="size-11" />
      </header>

      <div className="flex flex-col gap-5 px-5 pt-4">
        <div className="flex flex-col items-center gap-1 py-2">
          <label htmlFor="balance" className="text-[13px] text-muted">
            ¿Cuánto tenés hoy en Santander?
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
              onChange={(e) => setBalance(e.target.value.replace(/[^\d.,-]/g, ""))}
              style={{ width: `${Math.max(balance.length, 4) * 0.55}em` }}
              className="bg-transparent text-right outline-none placeholder:text-foreground/25"
            />
            <span className="ml-2">€</span>
          </div>
        </div>

        <p className="text-sm text-muted">
          Poné el saldo que ves hoy en la app del banco. La app descuenta lo que ya
          cargaste y guarda el resto como saldo inicial, antes de tu primer
          movimiento. Después lo podés editar desde Movimientos.
        </p>

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
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
