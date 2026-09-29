"use client";

import { useActionState, useMemo, useState } from "react";
import { flexCycle } from "@/lib/flex";
import { formatEUR, formatShortDate } from "@/lib/format";
import type { Account, Category, Transaction, TransactionType } from "@/lib/types";
import { Chip } from "@/components/chip";
import { SectionLabel, Segmented, SheetHeader, Switch } from "@/components/ios";
import { createTransaction } from "./actions";
import { updateTransaction } from "../movimientos/actions";

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

const TITLES: Partial<Record<TransactionType, string>> = {
  saldo_inicial: "Ajuste de saldo",
  devolucion: "Devolución",
};

const rowSelect =
  "absolute inset-0 w-full cursor-pointer opacity-0"; // control nativo invisible sobre la fila
const row =
  "relative flex min-h-11 items-center justify-between gap-3 border-b-[0.5px] border-line pr-4 text-[17px] last:border-b-0";

const updown = (
  <svg width="11" height="16" viewBox="0 0 11 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60" aria-hidden="true">
    <polyline points="3 5 5.5 2.5 8 5" />
    <polyline points="3 11 5.5 13.5 8 11" />
  </svg>
);

// Sin `initial`: "Nuevo movimiento". Con `initial`: editor del movimiento.
// Saldo inicial y devolución se editan sin tipo ni categoría (la devolución
// conserva la categoría de su gasto).
export function CargarForm({
  accounts,
  categories,
  flexMovements,
  today,
  initial,
  backHref = "/",
  footer,
}: {
  accounts: Account[];
  categories: Category[];
  flexMovements: FlexMovement[];
  today: string;
  initial?: Transaction;
  backHref?: string;
  footer?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(
    initial ? updateTransaction : createTransaction,
    null,
  );

  const daily = accounts.find((a) => a.is_daily) ?? accounts[0];
  const initialCat = categories.find((c) => c.id === initial?.category_id);
  const special = initial?.type === "saldo_inicial" || initial?.type === "devolucion";

  const [tipo, setTipo] = useState<Tipo>(
    initial && !special ? (initial.type as Tipo) : "gasto",
  );
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
  const [date, setDate] = useState(initial?.date ?? today);
  const [repeat, setRepeat] = useState(false);
  const [accountId, setAccountId] = useState(initial?.account_id ?? daily?.id ?? "");
  const [toAccountId, setToAccountId] = useState(
    initial?.to_account_id ?? accounts.find((a) => a.id !== daily?.id)?.id ?? "",
  );

  const kind = tipo === "ingreso" ? "ingreso" : "gasto";
  const parents = categories.filter((c) => !c.parent_id && c.kind === kind);
  const subsOf = (id: string | null) =>
    categories.filter((c) => c.parent_id === id);

  // Ingresos: una sola categoría principal, se muestran directo sus subcategorías.
  const effectiveParent = tipo === "ingreso" ? (parents[0]?.id ?? null) : parentId;
  const subs = subsOf(effectiveParent);
  const categoryId = special
    ? (initial?.category_id ?? null)
    : subs.length
      ? subId
      : effectiveParent;

  function changeTipo(t: Tipo) {
    setTipo(t);
    setParentId(null);
    setSubId(null);
  }

  const selectedCat = categories.find((c) => c.id === categoryId);
  const flexLeft = useMemo(() => {
    if (special || tipo !== "gasto" || !selectedCat?.cycle_limit) return null;
    const { start, end } = flexCycle(date);
    const spent = flexMovements
      .filter(
        (m) =>
          m.category_id === selectedCat.id && m.date >= start && m.date <= end,
      )
      .reduce((s, m) => s + (m.type === "gasto" ? m.amount : -m.amount), 0);
    return { left: selectedCat.cycle_limit - spent, limit: selectedCat.cycle_limit };
  }, [special, tipo, selectedCat, date, flexMovements]);

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "—";
  const dateLabel =
    date === today ? `Hoy, ${formatShortDate(date)}` : formatShortDate(date);
  const title = initial
    ? (TITLES[initial.type] ?? "Editar movimiento")
    : "Nuevo movimiento";
  const allowNegative = initial?.type === "saldo_inicial";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col tabular-nums">
      <form action={formAction} className="flex flex-1 flex-col">
        {initial && <input type="hidden" name="id" value={initial.id} />}
        <input type="hidden" name="type" value={special ? initial!.type : tipo} />
        <input type="hidden" name="category_id" value={categoryId ?? ""} />

        <SheetHeader title={title} cancelHref={backHref} saving={pending} />

        <div className="flex flex-col gap-[18px] px-4 pt-2 pb-6">
          {!special && (
            <Segmented label="Tipo" options={TIPOS} value={tipo} onChange={changeTipo} />
          )}

          <div className="flex flex-col items-center gap-0.5 pt-1.5 pb-0.5">
            <div className="flex items-baseline justify-center font-serif text-[64px] leading-[1.05]">
              <input
                id="amount"
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                required
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value.replace(allowNegative ? /[^\d.,-]/g : /[^\d.,]/g, ""),
                  )
                }
                style={{ width: `${Math.max(amount.length, 4) * 0.55}em` }}
                className="bg-transparent text-right outline-none placeholder:text-foreground/25"
              />
              <span className="ml-2">€</span>
            </div>
            <label htmlFor="amount" className="text-[13px] text-muted">
              Importe
            </label>
            {special && selectedCat && (
              <p className="text-[13px] text-muted">Categoría: {selectedCat.name}</p>
            )}
          </div>

          <div className="rounded-[10px] bg-card pl-4">
            <div className={row}>
              <label htmlFor="name" className="w-24 shrink-0">
                Nombre
              </label>
              <input
                id="name"
                name="name"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Opcional"
                className="min-w-0 grow bg-transparent py-2.5 outline-none placeholder:text-muted/60"
              />
            </div>
          </div>

          {!special && tipo === "gasto" && (
            <div className="flex flex-col gap-2">
              <SectionLabel>Categoría</SectionLabel>
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

          {!special && tipo !== "transferencia" && subs.length > 0 && (
            <div className="flex flex-col gap-2">
              <SectionLabel>{tipo === "ingreso" ? "Categoría" : "Subcategoría"}</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {subs.map((c) => (
                  <Chip key={c.id} on={subId === c.id} onClick={() => setSubId(c.id)}>
                    {c.name}
                  </Chip>
                ))}
              </div>
              {flexLeft && (
                <p className="ml-4 text-[13px] text-muted">
                  Te quedan{" "}
                  <span className={flexLeft.left < 0 ? "text-negative" : "text-accent"}>
                    {formatEUR(flexLeft.left)}
                  </span>{" "}
                  de {formatEUR(flexLeft.limit)} hasta el 19
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col rounded-[10px] bg-card pl-4">
            <div className={row}>
              <label htmlFor="date">Fecha</label>
              <span className="rounded-[7px] bg-fill px-2.5 py-1 text-accent">{dateLabel}</span>
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
              <label htmlFor="account_id">
                {tipo === "transferencia" && !special ? "Desde" : "Cuenta"}
              </label>
              <span className="flex items-center gap-1.5 text-muted">
                {accountName(accountId)}
                {updown}
              </span>
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

            {!special && tipo === "transferencia" && (
              <div className={row}>
                <label htmlFor="to_account_id">Hacia</label>
                <span className="flex items-center gap-1.5 text-muted">
                  {accountName(toAccountId)}
                  {updown}
                </span>
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

            {!initial && (
              <div className={row}>
                <label htmlFor="repeat">Repetir cada mes</label>
                <Switch id="repeat" name="repeat" checked={repeat} onChange={setRepeat} />
              </div>
            )}
          </div>

          {initial?.recurring_id && (
            <p className="ml-4 text-[13px] text-muted">
              Viene de un recurrente: el cambio aplica solo a este movimiento.
            </p>
          )}

          {state?.error && (
            <p role="alert" className="ml-4 text-[15px] text-negative">
              {state.error}
            </p>
          )}
        </div>
      </form>

      {footer && (
        <div className="px-4 pb-[max(env(safe-area-inset-bottom),20px)]">{footer}</div>
      )}
    </div>
  );
}
