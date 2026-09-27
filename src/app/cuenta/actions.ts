"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PasswordState = { error: string } | null;

export async function changePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  if (next.length < 8) return { error: "La nueva contraseña tiene que tener al menos 8 caracteres." };
  if (next !== repeat) return { error: "Las contraseñas nuevas no coinciden." };
  if (next === current) return { error: "La nueva contraseña tiene que ser distinta de la actual." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  // Verifica la contraseña actual antes de cambiarla.
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (authError) return { error: "La contraseña actual no es correcta." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: `No se pudo cambiar: ${error.message}` };

  redirect("/cuenta?ok=contrasena");
}
