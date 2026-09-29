"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const input =
  "w-full rounded-xl border border-foreground/15 bg-card px-4 py-3 text-base outline-none focus:border-accent";

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
    <form onSubmit={signIn} className="flex flex-col gap-3">
      <label className="text-sm text-muted" htmlFor="email">
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
      <label className="text-sm text-muted" htmlFor="password">
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
      <button
        disabled={loading}
        className="mt-2 w-full rounded-xl bg-accent px-4 py-3 font-medium text-on-accent disabled:opacity-50"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
      {error && <p className="text-sm text-negative">{error}</p>}
    </form>
  );
}
