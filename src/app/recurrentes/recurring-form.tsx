"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { formatShortDate } from "@/lib/format";
import type { Frequency, Recurring } from "@/lib/recurring";
import type { Account, Category } from "@/lib/types";
import { Chip } from "@/components/chip";
import {
  deleteRecurring,
  saveRecurring,
  toggleRecurring,
} from "./actions";

type Tipo = Recurring["type"];

const TIPOS: { value: Tipo; label: string }[] = [
  { value: "gasto", label: "Gasto" },
  { value: "ingreso", label: "Ingreso" },
  { value: "transferencia", label: "Transferencia" },
];

const FRECUENCIAS: { value: Frequency; label: string }[] = [
  { value: "mensual", label: "Mensual" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "anual", label: "Anual" },
];

const label = "text-[13px] text-muted";
const rowSelect = "absolute inset-0 w-full cursor-pointer opacity-0";
const row =
  "relative flex h-12 items-center justify-between border-b border-line-soft last:border-b-0";

function Segmented<T extends string>({
  label: aria,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={aria}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      className="grid gap-1 rounded-xl bg-segment p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-10 rounded-[9px] text-sm ${
            value === o.value ? "bg-segment-on font-semibold text-foreground shadow-sm" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function scheduleText(freq: Frequency, start: string) {
  const day = Number(start.slice(8, 10));
  if (freq === "mensual") return `Todos los meses, el día ${day}`;
  if (freq === "bimestral") return `Cada 2 meses, el día ${day}, desde ${formatShortDate(start)}`;
  if (freq === "trimestral") return `Cada 3 meses, el día ${day}, desde ${formatShortDate(start)}`;
  return `Todos los años, el ${formatShortDate(start)}`;
}

export function RecurringForm({
  accounts,
  categories,
  today,
  initial,
}: {
  accounts: Account[];
  categories: Category[];
  today: string;
  initial: Recurring | null;
}) {
  const [state, formAction, pending] = useActionState(saveRecurring, null);

  const daily = accounts.find((a) => a.is_daily) ?? accounts[0];
  const initialCat = categories.find((c) => c.id === initial?.category_id);

  const [tipo, setTipo] = useState<Tipo>(initial?.type ?? "gasto");
  const [amount, setAmount] = useState(
    initial ? initial.amount.toFixed(2).replace(".", ",") : "",
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [parentId, setParentId] = useState<string | null>(
    initialCat ? (initialCat.parent_id ?? initialCat.id) : null,
  );
  const [subId, setSubId] = useState<string | null>(
    initialCat?.parent_id ? initialCat.id : null,
  );
  const [accountId, setAccountId] = useState(initial?.account_id ?? daily?.id ?? "");
  const [toAccountId, setToAccountId] = useState(
    initial?.to_account_id ?? accounts.find((a) => a.id !== daily?.id)?.id ?? "",
  );
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? "mensual");
  const [startDate, setStartDate] = useState(initial?.start_date ?? today);
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");

  const kind = tipo === "ingreso" ? "ingreso" : "gasto";
  const parents = categories.filter((c) => !c.parent_id && c.kind === kind);
  const effectiveParent = tipo === "ingreso" ? (parents[0]?.id ?? null) : parentId;
  const subs = categories.filter((c) => c.parent_id === effectiveParent);
  const categoryId = subs.length ? subId : effectiveParent;

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "—";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col tabular-nums">
      <header className="flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top),16px)]">
        <Link
          href="/recurrentes"
          aria-label="Cerrar"
          className="flex size-11 items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </Link>
        <h1 className="text-[17px] font-semibold">
          {initial ? "Editar recurrente" : "Nuevo recurrente"}
        </h1>
        <div className="size-11" />
      </header>

      <form action={formAction} className="flex flex-1 flex-col">
        <input type="hidden" name="id" value={initial?.id ?? ""} />
        <input type="hidden" name="type" value={tipo} />
        <input type="hidden" name="category_id" value={categoryId ?? ""} />
        <input type="hidden" name="frequency" value={frequency} />

        <div className="flex flex-col gap-5 px-5 pt-4">
          <Segmented
            label="Tipo"
            options={TIPOS}
            value={tipo}
            onChange={(t) => {
              setTipo(t);
              setParentId(null);
              setSubId(null);
            }}
          />

          <div className="flex flex-col items-center gap-1 py-2">
            <label htmlFor="amount" className={label}>
              Importe
            </label>
            <div className="flex items-baseline justify-center font-serif text-[60px] leading-tight">
              <input
                id="amount"
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                style={{ width: `${Math.max(amount.length, 4) * 0.55}em` }}
                className="bg-transparent text-right outline-none placeholder:text-foreground/25"
              />
              <span className="ml-2">€</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className={label}>
              Nombre
            </label>
            <input
              id="name"
              name="name"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Alquiler, Digi, Salario"
              className="h-12 rounded-xl border border-line bg-card px-3.5 text-base outline-none focus:border-accent"
            />
          </div>

          {tipo === "gasto" && (
            <div className="flex flex-col gap-2">
              <div className={label}>Categoría</div>
              <div className="flex flex-wrap gap-2">
                {parents.map((c) => (
                  <Chip
                    key={c.id}
                    on={parentId === c.id}
                    onClick={() => {
                      setParentId(c.id);
                      setSubId(null);
                    }}
                  >
                    {c.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {tipo !== "transferencia" && subs.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className={label}>{tipo === "ingreso" ? "Categoría" : "Subcategoría"}</div>
              <div className="flex flex-wrap gap-2">
                {subs.map((c) => (
                  <Chip key={c.id} on={subId === c.id} onClick={() => setSubId(c.id)}>
                    {c.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className={label}>Frecuencia</div>
            <Segmented
              label="Frecuencia"
              options={FRECUENCIAS}
              value={frequency}
              onChange={setFrequency}
            />
            <p className="text-sm text-muted">{scheduleText(frequency, startDate)}</p>
          </div>

          <div className="flex flex-col rounded-2xl bg-card px-4">
            <div className={row}>
              <label htmlFor="start_date" className="text-[15px]">
                Primera fecha
              </label>
              <span className="text-[15px] text-muted">{formatShortDate(startDate)} {startDate.slice(0, 4)}</span>
              <input
                id="start_date"
                name="start_date"
                type="date"
                required
                value={startDate}
                onChange={(e) => e.target.value && setStartDate(e.target.value)}
                className={rowSelect}
              />
            </div>

            <div className={row}>
              <label htmlFor="end_date" className="text-[15px]">
                Termina
              </label>
              <span className="text-[15px] text-muted">
                {endDate ? `${formatShortDate(endDate)} ${endDate.slice(0, 4)}` : "Nunca"}
              </span>
              <input
                id="end_date"
                name="end_date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={rowSelect}
              />
            </div>

            <div className={row}>
              <label htmlFor="account_id" className="text-[15px]">
                {tipo === "transferencia" ? "Desde" : "Cuenta"}
              </label>
              <span className="text-[15px] text-muted">{accountName(accountId)}</span>
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

            {tipo === "transferencia" && (
              <div className={row}>
                <label htmlFor="to_account_id" className="text-[15px]">
                  Hacia
                </label>
                <span className="text-[15px] text-muted">{accountName(toAccountId)}</span>
                <select
                  id="to_account_id"
                  name="to_account_id"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className={rowSelect}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {endDate && (
            <button
              type="button"
              onClick={() => setEndDate("")}
              className="-mt-3 self-start text-sm text-muted underline"
            >
              Quitar fecha de fin
            </button>
          )}

          {state?.error && (
            <p role="alert" className="text-sm text-negative">
              {state.error}
            </p>
          )}
        </div>

        <div className="mt-auto px-5 pt-4 pb-4">
          <button
            disabled={pending}
            className="h-[52px] w-full rounded-[14px] bg-accent text-base font-semibold text-on-accent disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>

      {initial && (
        <div className="grid grid-cols-2 gap-3 px-5 pb-[max(env(safe-area-inset-bottom),20px)]">
          <form action={toggleRecurring}>
            <input type="hidden" name="id" value={initial.id} />
            <button className="h-12 w-full rounded-[14px] border border-line bg-card text-[15px]">
              {initial.active ? "Pausar" : "Reanudar"}
            </button>
          </form>
          <form
            action={deleteRecurring}
            onSubmit={(e) => {
              if (!confirm(`¿Borrar "${initial.name || "este recurrente"}"? Los movimientos pasados se mantienen.`))
                e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={initial.id} />
            <button className="h-12 w-full rounded-[14px] border border-negative/30 bg-card text-[15px] text-negative">
              Borrar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
