import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">App de Finanzas</h1>
      <p className="text-muted">
        Sesión iniciada como <span className="text-foreground">{email}</span>
      </p>
      <form action={signOut}>
        <button className="rounded-xl border border-foreground/15 px-4 py-2 text-sm">
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
