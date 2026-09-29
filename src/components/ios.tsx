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
    <header className="grid h-11 grid-cols-[96px_minmax(0,1fr)_96px] items-center px-4 pt-[env(safe-area-inset-top)] box-content">
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
