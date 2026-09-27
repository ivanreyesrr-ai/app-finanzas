"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isISODate, validateMovement } from "@/lib/validate-movement";

export type CargarState = { error: string } | null;

export async function createTransaction(
  _prev: CargarState,
  formData: FormData,
): Promise<CargarState> {
  const date = String(formData.get("date") ?? "");
  const repeat = formData.get("repeat") === "on";
  if (!isISODate(date)) return { error: "Fecha no válida." };

  const supabase = await createClient();
  const valid = await validateMovement(supabase, formData);
  if ("error" in valid) return valid;
  const base = valid.data;

  let recurringId: string | null = null;
  if (repeat) {
    const { data, error } = await supabase
      .from("recurring")
      .insert({
        ...base,
        day_of_month: Number(date.slice(8, 10)),
        frequency: "mensual",
        start_date: date,
        // Este mes ya queda cubierto por el movimiento que se guarda ahora.
        last_generated_month: `${date.slice(0, 7)}-01`,
      })
      .select("id")
      .single();
    if (error) return { error: `No se pudo crear el recurrente: ${error.message}` };
    recurringId = data.id;
  }

  const { error } = await supabase
    .from("transactions")
    .insert({ ...base, date, recurring_id: recurringId });

  if (error) {
    // Sin transacción entre tablas: si falla el movimiento, deshacemos el recurrente.
    if (recurringId) await supabase.from("recurring").delete().eq("id", recurringId);
    return { error: `No se pudo guardar: ${error.message}` };
  }

  redirect("/");
}
