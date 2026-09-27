import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">App de Finanzas</h1>
      <LoginForm
        initialError={
          error === "link" ? "El enlace no es válido o expiró. Pedí uno nuevo." : ""
        }
      />
    </main>
  );
}
