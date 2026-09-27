import { notFound } from "next/navigation";
import { todayISO } from "@/lib/format";
import type { Recurring } from "@/lib/recurring";
import { RecurringForm } from "../recurring-form";
import { loadFormData } from "../form-data";

export default async function EditarRecurrente({
  params,
}: PageProps<"/recurrentes/[id]">) {
  const { id } = await params;
  const { supabase, accounts, categories } = await loadFormData();

  const { data: r } = await supabase
    .from("recurring")
    .select("*")
    .eq("id", id)
    .maybeSingle<Recurring>();
  if (!r) notFound();

  return (
    <RecurringForm
      accounts={accounts}
      categories={categories}
      today={todayISO()}
      initial={{ ...r, amount: Number(r.amount) }}
    />
  );
}
