"use client";

import { useActionState } from "react";
import { groupRow, SheetHeader } from "@/components/ios";
import { changePassword } from "../actions";

const input = "min-w-0 grow bg-transparent py-2.5 text-[17px] outline-none placeholder:text-muted/60";

export default function ContrasenaPage() {
  const [state, formAction, pending] = useActionState(changePassword, null);

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <SheetHeader title="Contraseña" cancelHref="/cuenta" saving={pending} />

      <div className="flex flex-col gap-1.5 px-4 pt-4">
        <div className="flex flex-col rounded-[10px] bg-card pl-4">
          <div className={groupRow}>
            <label htmlFor="current" className="w-24 shrink-0 text-[17px]">
              Actual
            </label>
            <input id="current" name="current" type="password" autoComplete="current-password" required placeholder="Obligatoria" className={input} />
          </div>
          <div className={groupRow}>
            <label htmlFor="next" className="w-24 shrink-0 text-[17px]">
              Nueva
            </label>
            <input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required placeholder="Mínimo 8 caracteres" className={input} />
          </div>
          <div className={groupRow}>
            <label htmlFor="repeat" className="w-24 shrink-0 text-[17px]">
              Repetir
            </label>
            <input id="repeat" name="repeat" type="password" autoComplete="new-password" minLength={8} required placeholder="Otra vez la nueva" className={input} />
          </div>
        </div>

        {state?.error && (
          <p role="alert" className="mx-4 mt-2 text-[15px] text-negative">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
