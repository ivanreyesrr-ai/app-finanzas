import Link from "next/link";
import { notFound } from "next/navigation";
import type { Transaction } from "@/lib/types";
import { CargarForm } from "../../cargar/cargar-form";
import { loadMovementForm } from "../../cargar/load";
import { Chevron, Group, groupRow } from "@/components/ios";
import { DeleteButton } from "../delete-button";

export default async function EditarMovimiento({
  params,
}: PageProps<"/movimientos/[id]">) {
  const { id } = await params;
  const { supabase, accounts, categories, flexMovements, today } = await loadMovementForm();

  const { data: t } = await supabase
    .from("transactions")
    .select("id, account_id, to_account_id, date, mes_imputacion, amount, type, category_id, name, recurring_id, related_id")
    .eq("id", id)
    .maybeSingle<Transaction>();
  if (!t) notFound();

  const { count: devoluciones } =
    t.type === "gasto"
      ? await supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("related_id", t.id)
      : { count: 0 };

  const back = `/movimientos?mes=${t.mes_imputacion.slice(0, 7)}`;
  const confirmText =
    devoluciones && devoluciones > 0
      ? `¿Borrar este movimiento? También se borran sus ${devoluciones} devolución(es).`
      : "¿Borrar este movimiento?";

  return (
    <CargarForm
      accounts={accounts}
      categories={categories}
      flexMovements={flexMovements}
      today={today}
      initial={{ ...t, amount: Number(t.amount) }}
      backHref={back}
      footer={
        <Group>
          {t.type === "gasto" && (
            <Link href={`/movimientos/${t.id}/devolucion`} className={groupRow}>
              <span className="text-[17px] text-accent">Registrar devolución</span>
              <Chevron />
            </Link>
          )}
          <DeleteButton id={t.id} label={confirmText} />
        </Group>
      }
    />
  );
}
