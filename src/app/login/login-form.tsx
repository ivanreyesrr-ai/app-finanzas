"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const input =
  "w-full rounded-xl border border-foreground/15 bg-white px-4 py-3 text-base outline-none focus:border-accent";
const button =
  "w-full rounded-xl bg-accent px-4 py-3 font-medium text-white disabled:opacity-50";

export function LoginForm({ initialError }: { initialError: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      // Solo entra un usuario ya creado en Supabase: nadie más puede registrarse.
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) return setError(error.message);
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await createClient().auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.replace("/");
    router.refresh();
  }

  return (
    <>
      {step === "email" ? (
        <form onSubmit={sendCode} className="flex flex-col gap-3">
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
          <button disabled={loading} className={button}>
            {loading ? "Enviando…" : "Enviar código"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Te mandé un código a <span className="text-foreground">{email}</span>.
            También podés tocar el enlace del email.
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6,10}"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código"
            className={`${input} tracking-widest tabular-nums`}
          />
          <button disabled={loading} className={button}>
            {loading ? "Verificando…" : "Entrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
            }}
            className="text-sm text-muted underline"
          >
            Cambiar email
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
    </>
  );
}
