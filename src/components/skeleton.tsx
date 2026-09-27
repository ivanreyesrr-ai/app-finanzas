import { BottomNav } from "./bottom-nav";

// Esqueleto gris que se muestra al instante mientras llegan los datos.
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-line-soft ${className}`} />;
}

export function PageSkeleton({ hero = false, rows = 6 }: { hero?: boolean; rows?: number }) {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando"
      className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 pt-[max(env(safe-area-inset-top),24px)] pb-32"
    >
      <Bar className="mx-auto h-6 w-40" />
      {hero && (
        <div className="flex flex-col gap-2">
          <Bar className="h-4 w-36" />
          <Bar className="h-14 w-56" />
          <Bar className="h-3 w-48" />
        </div>
      )}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <Bar className="h-4 w-32" />
              <Bar className="h-3 w-24" />
            </div>
            <Bar className="h-4 w-16" />
          </div>
        ))}
      </div>
      <BottomNav />
    </main>
  );
}
