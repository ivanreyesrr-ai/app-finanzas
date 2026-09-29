import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-[15px] bg-card pb-1 font-serif text-[42px] leading-none text-accent shadow-sm">
          €
        </div>
        <h1 className="text-[28px] font-bold">Finanzas</h1>
      </div>
      <LoginForm />
    </main>
  );
}
