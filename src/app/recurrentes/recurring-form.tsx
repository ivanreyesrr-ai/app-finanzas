"use client";

import { useActionState, useState } from "react";
import { formatShortDate } from "@/lib/format";
import type { Frequency, Recurring } from "@/lib/recurring";
import type { Account, Category } from "@/lib/types";
import { Chip } from "@/components/chip";
import { Group, groupRow, SectionLabel, Segmented, SheetHeader } from "@/components/ios";
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

const rowSelect = "absolute inset-0 w-full cursor-pointer opacity-0";
const row =
  "relative flex min-h-11 items-center justify-between gap-3 border-b-[0.5px] border-line pr-4 text-[17px] last:border-b-0";

const updown = (
  <svg width="11" height="16" viewBox="0 0 11 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60" aria-hidden="true">
    <polyline points="3 5 5.5 2.5 8 5" />
    <polyline points="3 11 5.5 13.5 8 11" />
  </svg>
);

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
      <form action={formAction} className="flex flex-col">
        <input type="hidden" name="id" value={initial?.id ?? ""} />
        <input type="hidden" name="type" value={tipo} />
        <input type="hidden" name="category_id" value={categoryId ?? ""} />
        <input type="hidden" name="frequency" value={frequency} />

        <SheetHeader
          title={initial ? "Editar recurrente" : "Nuevo recurrente"}
          cancelHref="/recurrentes"
          saving={pending}
        />

        <div className="flex flex-col gap-[18px] px-4 pt-2 pb-6">
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
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                style={{ width: `${Math.max(amount.length, 4) * 0.55}em` }}
                className="bg-transparent text-right outline-none placeholder:text-foreground/25"
              />
              <span className="ml-2">€</span>
            </div>
            <label htmlFor="amount" className="text-[13px] text-muted">
              Importe
            </label>
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
                placeholder="Ej. Alquiler, Digi"
                className="min-w-0 grow bg-transparent py-2.5 outline-none placeholder:text-muted/60"
              />
            </div>
          </div>

          {tipo === "gasto" && (
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

          {tipo !== "transferencia" && subs.length > 0 && (
            <div className="flex flex-col gap-2">
              <SectionLabel>{tipo === "ingreso" ? "Categoría" : "Subcategoría"}</SectionLabel>
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
            <SectionLabel>Frecuencia</SectionLabel>
            <Segmented
              label="Frecuencia"
              options={FRECUENCIAS}
              value={frequency}
              onChange={setFrequency}
            />
            <p className="ml-4 text-[13px] text-muted">{scheduleText(frequency, startDate)}</p>
          </div>

          <div className="flex flex-col rounded-[10px] bg-card pl-4">
            <div className={row}>
              <label htmlFor="start_date">Primera fecha</label>
              <span className="rounded-[7px] bg-fill px-2.5 py-1 text-accent">
                {formatShortDate(startDate)} {startDate.slice(0, 4)}
              </span>
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
              <label htmlFor="end_date">Termina</label>
              <span className="rounded-[7px] bg-fill px-2.5 py-1 text-accent">
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
              <label htmlFor="account_id">{tipo === "transferencia" ? "Desde" : "Cuenta"}</label>
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

            {tipo === "transferencia" && (
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
          </div>

          {endDate && (
            <button
              type="button"
              onClick={() => setEndDate("")}
              className="-mt-2 ml-4 self-start text-[15px] text-accent"
            >
              Quitar fecha de fin
            </button>
          )}

          {state?.error && (
            <p role="alert" className="ml-4 text-[15px] text-negative">
              {state.error}
            </p>
          )}
        </div>
      </form>

      {initial && (
        <div className="pb-[max(env(safe-area-inset-bottom),20px)]">
          <Group>
            <form action={toggleRecurring} className={groupRow}>
              <input type="hidden" name="id" value={initial.id} />
              <button className="w-full text-left text-[17px] text-accent">
                {initial.active ? "Pausar" : "Reanudar"}
              </button>
            </form>
            <form
              action={deleteRecurring}
              onSubmit={(e) => {
                if (!confirm(`¿Borrar "${initial.name || "este recurrente"}"? Los movimientos pasados se mantienen.`))
                  e.preventDefault();
              }}
              className={groupRow}
            >
              <input type="hidden" name="id" value={initial.id} />
              <button className="w-full text-left text-[17px] text-negative">Borrar</button>
            </form>
          </Group>
        </div>
      )}
    </div>
  );
}
