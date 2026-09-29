"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { groupRow } from "@/components/ios";

const input = "min-w-0 grow bg-transparent py-2.5 text-[17px] outline-none";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await createClient().auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      return setError(
        error.code === "invalid_credentials"
          ? "Email o contraseña incorrectos."
          : error.message,
      );
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={signIn} className="flex flex-col gap-4">
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
        disabled={loading}
        className="h-[50px] w-full rounded-xl bg-accent text-[17px] font-semibold text-on-accent disabled:opacity-50"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
      {error && <p className="mx-4 text-[15px] text-negative">{error}</p>}
    </form>
  );
}
