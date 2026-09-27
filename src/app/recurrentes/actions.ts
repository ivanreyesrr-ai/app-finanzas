"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";
import {
  fechaRecurrente,
  initialLastGenerated,
  type Frequency,
  type Recurring,
} from "@/lib/recurring";
import { isISODate, validateMovement } from "@/lib/validate-movement";

export type RecurringState = { error: string } | null;

const FREQUENCIES: Frequency[] = ["mensual", "bimestral", "anual"];

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Movimientos ya generados de este recurrente que todavía no llegaron (fecha > hoy).
function pendingOf(supabase: Supabase, id: string, today: string) {
  return supabase
    .from("transactions")
    .select("id, date")
    .eq("recurring_id", id)
    .gt("date", today);
}

export async function saveRecurring(
  _prev: RecurringState,
  formData: FormData,
): Promise<RecurringState> {
  const id = String(formData.get("id") ?? "") || null;
  const frequency = String(formData.get("frequency")) as Frequency;
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "") || null;

  if (!FREQUENCIES.includes(frequency)) return { error: "Elegí la frecuencia." };
  if (!isISODate(startDate)) return { error: "Fecha de inicio no válida." };
  if (endDate && (!isISODate(endDate) || endDate < startDate))
    return { error: "La fecha de fin tiene que ser posterior al inicio." };

  const supabase = await createClient();
  const valid = await validateMovement(supabase, formData);
  if ("error" in valid) return valid;

  const today = todayISO();
  const schedule = {
    start_date: startDate,
    end_date: endDate,
    day_of_month: Number(startDate.slice(8, 10)),
    frequency,
  };
  const fields = { ...valid.data, ...schedule };

  if (!id) {
    const { error } = await supabase.from("recurring").insert({
      ...fields,
      last_generated_month: initialLastGenerated(schedule, today),
    });
    if (error) return { error: `No se pudo guardar: ${error.message}` };
    redirect("/recurrentes");
  }

  const { error } = await supabase.from("recurring").update(fields).eq("id", id);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  // El cambio también aplica a los movimientos pendientes ya generados.
  const { data: pending } = await pendingOf(supabase, id, today);
  for (const t of pending ?? []) {
    const date = fechaRecurrente(schedule, t.date.slice(0, 7));
    if (!date || date <= today) {
      await supabase.from("transactions").delete().eq("id", t.id);
    } else {
      await supabase
        .from("transactions")
        .update({ ...valid.data, date })
        .eq("id", t.id);
    }
  }

  redirect("/recurrentes");
}

export async function toggleRecurring(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const today = todayISO();

  const { data: r } = await supabase
    .from("recurring")
    .select("*")
    .eq("id", id)
    .single<Recurring>();
  if (!r) redirect("/recurrentes");

  if (r.active) {
    // Pausar: se borran sus pendientes; el historial queda.
    const { data: pending } = await pendingOf(supabase, id, today);
    const ids = (pending ?? []).map((t) => t.id);
    if (ids.length) await supabase.from("transactions").delete().in("id", ids);
    await supabase.from("recurring").update({ active: false }).eq("id", id);
  } else {
    // Reanudar: sin cargar los meses en pausa ni una fecha de este mes que ya pasó.
    const fresh = initialLastGenerated(r, today);
    const last =
      r.last_generated_month && r.last_generated_month > fresh
        ? r.last_generated_month
        : fresh;
    await supabase
      .from("recurring")
      .update({ active: true, last_generated_month: last })
      .eq("id", id);
  }

  redirect("/recurrentes");
}

export async function deleteRecurring(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const { data: pending } = await pendingOf(supabase, id, todayISO());
  const ids = (pending ?? []).map((t) => t.id);
  if (ids.length) await supabase.from("transactions").delete().in("id", ids);
  // Los movimientos pasados quedan (recurring_id pasa a null).
  await supabase.from("recurring").delete().eq("id", id);

  redirect("/recurrentes");
}
