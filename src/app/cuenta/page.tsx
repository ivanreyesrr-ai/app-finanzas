import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEMO_EMAIL } from "@/lib/demo";
import { BackLink, Chevron, Group, groupRow } from "@/components/ios";
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-10">
      <header className="flex flex-col gap-1 px-4 pt-[calc(max(env(safe-area-inset-top),16px)+4px)]">
        <BackLink href="/" label="Inicio" />
        <h1 className="text-[34px] leading-[41px] font-bold tracking-[0.37px]">Mi cuenta</h1>
      </header>

      {ok === "contrasena" && (
        <p role="status" className="mx-4 mt-3 rounded-xl bg-accent/10 p-3 text-[15px] text-accent">
          Contraseña actualizada.
        </p>
      )}

      <div className="mt-5">
        <Group>
          <div className={groupRow}>
            <div className="flex min-w-0 flex-col">
              <div className="text-[17px] break-all">{user?.email}</div>
              {user?.last_sign_in_at && (
                <div className="text-[13px] text-muted">
                  Último inicio de sesión: {dateFormat.format(new Date(user.last_sign_in_at))}
                </div>
              )}
            </div>
          </div>
        </Group>
      </div>

      {user?.email === DEMO_EMAIL ? (
        <p className="mx-8 mt-2 text-[13px] text-muted">
          Estás en la demo: los datos son inventados y se pueden tocar sin miedo.
        </p>
      ) : (
        <div className="mt-8">
          <Group>
            <Link href="/cuenta/contrasena" className={groupRow}>
              <span className="text-[17px]">Cambiar contraseña</span>
              <Chevron />
            </Link>
          </Group>
        </div>
      )}

      <div className="mt-8">
        <Group>
          <form action={signOut} className={groupRow}>
            <button className="w-full text-left text-[17px] text-negative">Cerrar sesión</button>
          </form>
        </Group>
      </div>
    </main>
  );
}
