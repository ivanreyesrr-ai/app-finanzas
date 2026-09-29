"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";
import { groupRow } from "@/components/ios";

const input = "min-w-0 grow bg-transparent py-2.5 text-[17px] outline-none";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"" | "cuenta" | "demo">("");
  const [error, setError] = useState("");

  async function enter(credentials: { email: string; password: string }, kind: "cuenta" | "demo") {
    setLoading(kind);
    setError("");
    const { error } = await createClient().auth.signInWithPassword(credentials);
    setLoading("");
    if (error) {
      return setError(
        kind === "demo"
          ? "La demo no está disponible ahora."
          : error.code === "invalid_credentials"
            ? "Email o contraseña incorrectos."
            : error.message,
      );
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        enter({ email, password }, "cuenta");
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col rounded-[10px] bg-card pl-4">
        <div className={groupRow}>
          <label htmlFor="email" className="w-28 shrink-0 text-[17px]">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </div>
        <div className={groupRow}>
          <label htmlFor="password" className="w-28 shrink-0 text-[17px]">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </div>
      </div>
      <button
        disabled={!!loading}
        className="h-[50px] w-full rounded-xl bg-accent text-[17px] font-semibold text-on-accent disabled:opacity-50"
      >
        {loading === "cuenta" ? "Entrando…" : "Entrar"}
      </button>
      <button
        type="button"
        disabled={!!loading}
        onClick={() => enter({ email: DEMO_EMAIL, password: DEMO_PASSWORD }, "demo")}
        className="h-11 w-full text-[17px] text-accent disabled:opacity-50"
      >
        {loading === "demo" ? "Entrando a la demo…" : "Probar la demo con datos de ejemplo"}
      </button>
      {error && <p className="mx-4 text-[15px] text-negative">{error}</p>}
    </form>
  );
}
