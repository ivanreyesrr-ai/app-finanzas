import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

const dateFormat = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

export default async function CuentaPage({ searchParams }: PageProps<"/cuenta">) {
  const { ok } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center px-3 pt-[max(env(safe-area-inset-top),16px)] pb-2">
        <Link href="/" aria-label="Volver" className="flex size-11 items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="text-center text-[17px] font-semibold">Mi cuenta</h1>
        <div />
      </header>

      <div className="flex flex-col gap-6 px-5 pt-4">
        <section className="flex flex-col gap-1">
          <div className="text-[17px] font-medium break-all">{user?.email}</div>
          {user?.last_sign_in_at && (
            <div className="text-[13px] text-muted">
              Último inicio de sesión: {dateFormat.format(new Date(user.last_sign_in_at))}
            </div>
          )}
        </section>

        {ok === "contrasena" && (
          <p role="status" className="rounded-xl bg-accent/10 p-3 text-sm text-accent">
            Contraseña actualizada.
          </p>
        )}

        <nav className="flex flex-col rounded-2xl bg-card px-4">
          <Link
            href="/cuenta/contrasena"
            className="flex h-12 items-center justify-between text-[15px]"
          >
            Cambiar contraseña
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </nav>

        <form action={signOut}>
          <button className="h-12 w-full rounded-[14px] border border-negative/30 bg-card text-[15px] text-negative">
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
