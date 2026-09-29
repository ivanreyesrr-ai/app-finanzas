import Link from "next/link";

// Piezas estilo iOS compartidas por las pantallas de carga y edición.

// Cabecera de hoja: Cancelar · título · Guardar (el botón envía el form que la contiene).
export function SheetHeader({
  title,
  cancelHref,
  saveLabel = "Guardar",
  saving = false,
  disabled = false,
}: {
  title: string;
  cancelHref: string;
  saveLabel?: string;
  saving?: boolean;
  disabled?: boolean;
}) {
  return (
    // Fija arriba: al abrir el teclado iOS desplaza la página y la cabecera
    // quedaba debajo de la barra de estado.
    <header className="sticky top-0 z-10 box-content grid h-11 grid-cols-[96px_minmax(0,1fr)_96px] items-center bg-background px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-1">

      <Link href={cancelHref} className="text-[17px] text-accent">
        Cancelar
      </Link>
      <h1 className="truncate text-center text-[17px] font-semibold">{title}</h1>
      <button
        disabled={saving || disabled}
        className="justify-self-end text-[17px] font-semibold text-accent disabled:opacity-40"
      >
        {saving ? "Guardando…" : saveLabel}
      </button>
    </header>
  );
}

// Control segmentado (radio group).
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      className="grid gap-0.5 rounded-[9px] bg-segment p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-[30px] rounded-[7px] text-[13px] ${
            value === o.value
              ? "bg-segment-on font-semibold shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]"
              : "font-medium"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Interruptor iOS sobre un checkbox real (se envía con el form).
export function Switch({
  id,
  name,
  checked,
  onChange,
}: {
  id: string;
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <span className="relative inline-flex h-[31px] w-[51px] shrink-0">
      <input
        id={id}
        name={name}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
      />
      <span className="absolute inset-0 rounded-full bg-switch-off transition-colors peer-checked:bg-accent" />
      <span className="absolute top-0.5 left-0.5 size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] transition-transform peer-checked:translate-x-5" />
    </span>
  );
}

// Título de sección en mayúsculas, como en los ajustes de iOS.
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="ml-4 text-[13px] text-muted uppercase">{children}</div>;
}

// Cabecera de pestaña: título grande con los botones redondos en la misma línea.
export function LargeTitle({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1 px-4 pt-[calc(max(env(safe-area-inset-top),16px)+12px)]">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[34px] leading-[41px] font-bold tracking-[0.37px]">{title}</h1>
        <div className="flex shrink-0 gap-2">{actions}</div>
      </div>
      {children}
    </header>
  );
}

// "‹ Atrás" de una pantalla secundaria, encima del título grande.
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="-ml-1.5 flex h-9 items-center gap-0.5 self-start text-[17px] text-accent"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {label}
    </Link>
  );
}

// Botón redondo de la cabecera (Mi cuenta, Nuevo…).
export function RoundButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-full bg-fill text-accent"
    >
      {children}
    </Link>
  );
}

export const plusIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// Título de un grupo de lista (mayúsculas, gris), con un valor opcional a la derecha.
export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <h2 className="mx-8 mt-[22px] mb-1.5 flex justify-between gap-3 text-[13px] font-normal text-muted uppercase">
      <span>{children}</span>
      {right && <span className="shrink-0">{right}</span>}
    </h2>
  );
}

// Lista agrupada: tarjeta con separadores que arrancan después del margen izquierdo.
export function Group({ children }: { children: React.ReactNode }) {
  return <section className="mx-4 flex flex-col rounded-xl bg-card pl-4">{children}</section>;
}

// Clases de una fila de Group.
export const groupRow =
  "flex min-h-11 items-center justify-between gap-3 border-b-[0.5px] border-line py-2.5 pr-4 last:border-b-0";

export function Chevron() {
  return (
    <svg width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted opacity-50" aria-hidden="true">
      <polyline points="1.5 1.5 6.5 6.5 1.5 11.5" />
    </svg>
  );
}
