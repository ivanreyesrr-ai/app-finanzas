"use client";

import Link from "next/link";
import { useActionState } from "react";
import { changePassword } from "../actions";

const input =
  "h-12 w-full rounded-xl border border-line bg-white px-3.5 text-base outline-none focus:border-accent";

export default function ContrasenaPage() {
  const [state, formAction, pending] = useActionState(changePassword, null);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center px-3 pt-[max(env(safe-area-inset-top),16px)] pb-2">
        <Link href="/cuenta" aria-label="Volver" className="flex size-11 items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="text-center text-[17px] font-semibold">Cambiar contraseña</h1>
        <div />
      </header>

      <form action={formAction} className="flex flex-col gap-3 px-5 pt-4">
        <label htmlFor="current" className="text-[13px] text-muted">
          Contraseña actual
        </label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className={input} />

        <label htmlFor="next" className="mt-2 text-[13px] text-muted">
          Nueva contraseña (mínimo 8 caracteres)
        </label>
        <input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required className={input} />

        <label htmlFor="repeat" className="text-[13px] text-muted">
          Repetir nueva contraseña
        </label>
        <input id="repeat" name="repeat" type="password" autoComplete="new-password" minLength={8} required className={input} />

        {state?.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button
          disabled={pending}
          className="mt-3 h-[52px] w-full rounded-[14px] bg-accent text-base font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </form>
    </main>
  );
}
