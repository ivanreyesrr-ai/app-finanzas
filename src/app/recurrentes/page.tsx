import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate, todayISO } from "@/lib/format";
import { generarRecurrentes } from "@/lib/generate";
import { isHidden, money } from "@/lib/hidden";
import {
  monthlyCommitment,
  nextDate,
  type Frequency,
  type Recurring,
} from "@/lib/recurring";
import type { Account, Category } from "@/lib/types";
import { BottomNav } from "@/components/bottom-nav";
import { EyeToggle } from "@/components/eye-toggle";
import {
  Chevron,
  Group,
  groupRow,
  LargeTitle,
  plusIcon,
  RoundButton,
  SectionTitle,
} from "@/components/ios";

const GROUPS: { freq: Frequency; title: string }[] = [
  { freq: "mensual", title: "Mensuales" },
  { freq: "bimestral", title: "Bimestrales" },
  { freq: "trimestral", title: "Trimestrales" },
  { freq: "anual", title: "Anuales" },
];

export default async function RecurrentesPage() {
  const supabase = await createClient();
  const genError = await generarRecurrentes(supabase);
  const hidden = await isHidden();
  const today = todayISO();

  const [{ data: recurring }, { data: accounts }, { data: categories }] =
    await Promise.all([
      supabase.from("recurring").select("*").order("day_of_month").returns<Recurring[]>(),
      supabase.from("accounts").select("id, name").returns<Pick<Account, "id" | "name">[]>(),
      supabase.from("categories").select("id, name").returns<Pick<Category, "id" | "name">[]>(),
    ]);

  const all = (recurring ?? []).map((r) => ({ ...r, amount: Number(r.amount) }));
  const accountName = new Map(accounts?.map((a) => [a.id, a.name]));
  const categoryName = new Map(categories?.map((c) => [c.id, c.name]));
  const paused = all.filter((r) => !r.active);

  function Row({ r }: { r: Recurring }) {
    const next = r.active ? nextDate(r, today) : null;
    const when =
      r.frequency === "mensual"
        ? `día ${r.day_of_month}`
        : next
          ? formatShortDate(next)
          : "—";
    const detail =
      r.type === "transferencia"
        ? `${accountName.get(r.account_id)} → ${accountName.get(r.to_account_id ?? "")}`
        : `${categoryName.get(r.category_id ?? "") ?? ""} · ${accountName.get(r.account_id)}`;
    const sign = r.type === "ingreso" ? "+" : r.type === "gasto" ? "−" : "";
    return (
      <Link href={`/recurrentes/${r.id}`} className={groupRow}>
        <div className={`min-w-0 grow ${r.active ? "" : "opacity-50"}`}>
          <div className="truncate text-[17px]">
            {r.name || categoryName.get(r.category_id ?? "") || "Transferencia"}
          </div>
          <div className="truncate text-[13px] text-muted">{detail}</div>
        </div>
        <div className={`flex shrink-0 flex-col items-end ${r.active ? "" : "opacity-50"}`}>
          <div className={`text-[17px] ${r.type === "ingreso" ? "text-accent" : ""}`}>
            {money(r.amount, hidden, sign)}
          </div>
          <div className="text-[13px] text-muted">{when}</div>
        </div>
        <Chevron />
      </Link>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-32 tabular-nums">
      <LargeTitle
        title="Recurrentes"
        actions={
          <>
            <EyeToggle hidden={hidden} />
            <RoundButton href="/recurrentes/nuevo" label="Nuevo recurrente">
              {plusIcon}
            </RoundButton>
          </>
        }
      />

      {genError && (
        <p role="alert" className="mx-4 mt-2 rounded-xl bg-negative/10 p-3 text-sm text-negative">
          No se pudieron generar los recurrentes del mes. ¿Aplicaste la migración
          20260927000005_generar_recurrentes.sql? ({genError.message})
        </p>
      )}

      <div className="mt-3">
        <Group>
          <div className={groupRow}>
            <div className="text-[17px]">Comprometido por mes</div>
            <div className="text-[17px] font-semibold">
              {money(monthlyCommitment(all), hidden)}
            </div>
          </div>
        </Group>
      </div>

      {all.length === 0 && (
        <p className="mx-8 mt-6 text-[15px] text-muted">
          Todavía no tenés recurrentes. Creá uno con el + o marcando “Repetir
          cada mes” al cargar un movimiento.
        </p>
      )}

      {GROUPS.map(({ freq, title }) => {
        const list = all.filter((r) => r.active && r.frequency === freq);
        if (!list.length) return null;
        return (
          <div key={freq}>
            <SectionTitle>{title}</SectionTitle>
            <Group>
              {list.map((r) => (
                <Row key={r.id} r={r} />
              ))}
            </Group>
          </div>
        );
      })}

      {paused.length > 0 && (
        <div>
          <SectionTitle>Pausados</SectionTitle>
          <Group>
            {paused.map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </Group>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
