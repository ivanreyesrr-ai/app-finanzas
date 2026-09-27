import { todayISO } from "@/lib/format";
import { RecurringForm } from "../recurring-form";
import { loadFormData } from "../form-data";

export default async function NuevoRecurrente() {
  const { accounts, categories } = await loadFormData();
  return (
    <RecurringForm
      accounts={accounts}
      categories={categories}
      today={todayISO()}
      initial={null}
    />
  );
}
