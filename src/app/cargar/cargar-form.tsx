"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { flexCycle } from "@/lib/flex";
import { formatEUR, formatShortDate } from "@/lib/format";
import type { Account, Category } from "@/lib/types";
import { createTransaction } from "./actions";

export type FlexMovement = {
  date: string;
  amount: number;
  type: "gasto" | "devolucion";
  category_id: string;
};

type Tipo = "gasto" | "ingreso" | "transferencia";

const TIPOS: { value: Tipo; label: string }[] = [
  { value: "gasto", label: "Gasto" },
  { value: "ingreso", label: "Ingreso" },
  { value: "transferencia", label: "Transferencia" },
];

const label = "text-[13px] text-muted";
const rowSelect =
  "absolute inset-0 w-full cursor-pointer opacity-0"; // control nativo invisible sobre la fila

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-9 rounded-full border px-3.5 text-sm ${
        on
          ? "border-foreground bg-foreground text-white"
          : "border-line bg-white text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function CargarForm({
  accounts,
  categories,
  flexMovements,
  today,
}: {
  accounts: Account[];
  categories: Category[];
  flexMovements: FlexMovement[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState(createTransaction, null);

  const daily = accounts.find((a) => a.is_daily) ?? accounts[0];
  const [tipo, setTipo] = useState<Tipo>("gasto");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [repeat, setRepeat] = useState(false);
  const [accountId, setAccountId] = useState(daily?.id ?? "");
  const [toAccountId, setToAccountId] = useState(
    accounts.find((a) => a.id !== daily?.id)?.id ?? "",
  );

  const kind = tipo === "ingreso" ? "ingreso" : "gasto";
  const parents = categories.filter((c) => !c.parent_id && c.kind === kind);
  const subsOf = (id: string | null) =>
    categories.filter((c) => c.parent_id === id);

  // Ingresos: una sola categoría principal, se muestran directo sus subcategorías.
  const effectiveParent = tipo === "ingreso" ? (parents[0]?.id ?? null) : parentId;
  const subs = subsOf(effectiveParent);
  const categoryId = subs.length ? subId : effectiveParent;

  function changeTipo(t: Tipo) {
    setTipo(t);
    setParentId(null);
    setSubId(null);
  }

  const selectedCat = categories.find((c) => c.id === categoryId);
  const flexLeft = useMemo(() => {
    if (tipo !== "gasto" || !selectedCat?.cycle_limit) return null;
    const { start, end } = flexCycle(date);
    const spent = flexMovements
      .filter(
        (m) =>
          m.category_id === selectedCat.id && m.date >= start && m.date <= end,
      )
      .reduce((s, m) => s + (m.type === "gasto" ? m.amount : -m.amount), 0);
    return { left: selectedCat.cycle_limit - spent, limit: selectedCat.cycle_limit };
  }, [tipo, selectedCat, date, flexMovements]);

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "—";
  const dateLabel =
    date === today ? `Hoy, ${formatShortDate(date)}` : formatShortDate(date);

  return (
    <form
      action={formAction}
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col tabular-nums"
    >
      <input type="hidden" name="type" value={tipo} />
      <input type="hidden" name="category_id" value={categoryId ?? ""} />

      <header className="flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top),16px)]">
        <Link
          href="/"
          aria-label="Cerrar"
          className="flex size-11 items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </Link>
        <h1 className="text-[17px] font-semibold">Nuevo movimiento</h1>
        <div className="size-11" />
      </header>

      <div className="flex flex-col gap-5 px-5 pt-4">
        <div
          role="radiogroup"
          aria-label="Tipo"
          className="grid grid-cols-3 gap-1 rounded-xl bg-segment p-1"
        >
          {TIPOS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={tipo === t.value}
              onClick={() => changeTipo(t.value)}
              className={`h-10 rounded-[9px] text-sm ${
                tipo === t.value
                  ? "bg-white font-semibold text-foreground"
                  : "text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

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
            placeholder="Opcional"
            className="h-12 rounded-xl border border-line bg-white px-3.5 text-base outline-none focus:border-accent"
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
            <div className={label}>
              {tipo === "ingreso" ? "Categoría" : "Subcategoría"}
            </div>
            <div className="flex flex-wrap gap-2">
              {subs.map((c) => (
                <Chip key={c.id} on={subId === c.id} onClick={() => setSubId(c.id)}>
                  {c.name}
                </Chip>
              ))}
            </div>
            {flexLeft && (
              <p className="text-sm text-muted">
                Te quedan{" "}
                <span className={flexLeft.left < 0 ? "text-red-700" : "text-accent"}>
                  {formatEUR(flexLeft.left)}
                </span>{" "}
                de {formatEUR(flexLeft.limit)} hasta el 19
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col rounded-2xl bg-white px-4">
          <div className="relative flex h-12 items-center justify-between border-b border-line-soft">
            <label htmlFor="date" className="text-[15px]">
              Fecha
            </label>
            <span className="text-[15px] text-muted">{dateLabel}</span>
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

          <div className="relative flex h-12 items-center justify-between border-b border-line-soft">
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
            <div className="relative flex h-12 items-center justify-between border-b border-line-soft">
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

          <div className="flex h-12 items-center justify-between">
            <label htmlFor="repeat" className="text-[15px]">
              Repetir cada mes
            </label>
            <input
              id="repeat"
              name="repeat"
              type="checkbox"
              checked={repeat}
              onChange={(e) => setRepeat(e.target.checked)}
              className="size-[22px] accent-accent"
            />
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
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
