"use client";

import { useActionState, useState } from "react";
import type { Account, AccountType } from "@/lib/types";
import { Group, groupRow, SectionLabel, Segmented, SheetHeader } from "@/components/ios";
import { deleteAccount, moveAccount, saveAccount } from "./actions";

const TYPES: { value: AccountType; label: string }[] = [
  { value: "corriente", label: "Corriente" },
  { value: "ahorro", label: "Ahorro" },
  { value: "inversion", label: "Inversión" },
  { value: "efectivo", label: "Efectivo" },
];

const CURRENCIES: { value: "EUR" | "USD"; label: string }[] = [
  { value: "EUR", label: "EUR €" },
  { value: "USD", label: "USD $" },
];

const ERRORS: Record<string, string> = {
  diaria: "La cuenta del día a día no se puede borrar: de ella sale el “Te queda”.",
  "en-uso": "Esta cuenta tiene movimientos o recurrentes: no se puede borrar.",
  borrar: "No se pudo borrar la cuenta.",
};

export function AccountForm({
  initial,
  position,
  error,
}: {
  initial: Account | null;
  position?: { index: number; total: number };
  error?: string;
}) {
  const [state, formAction, pending] = useActionState(saveAccount, null);
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "ahorro");
  const [currency, setCurrency] = useState<"EUR" | "USD">(initial?.currency ?? "EUR");
  const message = state?.error ?? (error ? ERRORS[error] : undefined);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <form action={formAction} className="flex flex-col">
        <input type="hidden" name="id" value={initial?.id ?? ""} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="currency" value={currency} />

        <SheetHeader
          title={initial ? "Editar cuenta" : "Nueva cuenta"}
          cancelHref="/cuenta/cuentas"
          saving={pending}
        />

        <div className="flex flex-col gap-[18px] px-4 pt-3 pb-6">
          <div className="rounded-[10px] bg-card pl-4">
            <div className={`${groupRow} relative`}>
              <label htmlFor="name" className="w-24 shrink-0 text-[17px]">
                Nombre
              </label>
              <input
                id="name"
                name="name"
                autoComplete="off"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Revolut"
                className="min-w-0 grow bg-transparent text-[17px] outline-none placeholder:text-muted/60"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <SectionLabel>Tipo</SectionLabel>
            <Segmented label="Tipo" options={TYPES} value={type} onChange={setType} />
          </div>

          <div className="flex flex-col gap-2">
            <SectionLabel>Moneda</SectionLabel>
            {initial ? (
              <p className="ml-4 text-[15px] text-muted">
                {initial.currency === "USD" ? "Dólares (USD)" : "Euros (EUR)"}. La moneda no se
                cambia una vez creada la cuenta.
              </p>
            ) : (
              <Segmented label="Moneda" options={CURRENCIES} value={currency} onChange={setCurrency} />
            )}
          </div>

          {initial?.is_daily && (
            <p className="ml-4 text-[13px] text-muted">
              Es la cuenta del día a día: de ella salen el “Te queda” y el resumen de Inicio.
            </p>
          )}

          {message && (
            <p role="alert" className="ml-4 text-[15px] text-negative">
              {message}
            </p>
          )}
        </div>
      </form>

      {initial && position && (
        <div className="flex flex-col gap-8 pb-[max(env(safe-area-inset-bottom),20px)]">
          <div>
            <p className="mx-8 mb-1.5 text-[13px] text-muted uppercase">
              Orden: {position.index} de {position.total}
            </p>
            <Group>
              <form action={moveAccount} className={groupRow}>
                <input type="hidden" name="id" value={initial.id} />
                <input type="hidden" name="dir" value="-1" />
                <button disabled={position.index === 1} className="w-full text-left text-[17px] text-accent disabled:text-muted">
                  Subir
                </button>
              </form>
              <form action={moveAccount} className={groupRow}>
                <input type="hidden" name="id" value={initial.id} />
                <input type="hidden" name="dir" value="1" />
                <button disabled={position.index === position.total} className="w-full text-left text-[17px] text-accent disabled:text-muted">
                  Bajar
                </button>
              </form>
            </Group>
          </div>

          {!initial.is_daily && (
            <Group>
              <form
                action={deleteAccount}
                onSubmit={(e) => {
                  if (!confirm(`¿Borrar la cuenta "${initial.name}"?`)) e.preventDefault();
                }}
                className={groupRow}
              >
                <input type="hidden" name="id" value={initial.id} />
                <button className="w-full text-left text-[17px] text-negative">Borrar cuenta</button>
              </form>
            </Group>
          )}
        </div>
      )}
    </div>
  );
}
