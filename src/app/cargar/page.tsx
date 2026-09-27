import { CargarForm } from "./cargar-form";
import { loadMovementForm } from "./load";

export default async function CargarPage() {
  const { accounts, categories, flexMovements, today } = await loadMovementForm();
  return (
    <CargarForm
      accounts={accounts}
      categories={categories}
      flexMovements={flexMovements}
      today={today}
    />
  );
}
