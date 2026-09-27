import Link from "next/link";
import { addMonths, monthLabel } from "@/lib/month";

const chevron = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// ‹ Octubre 2026 › — el título vuelve al mes actual. `extra` conserva otros
// parámetros de la URL (filtros) al cambiar de mes.
export function MonthNav({
  basePath,
  month,
  currentMonth,
  extra = "",
}: {
  basePath: string;
  month: string;
  currentMonth: string;
  extra?: string;
}) {
  const href = (m: string) => `${basePath}?mes=${m}${extra}`;
  const isCurrent = month === currentMonth;
  return (
    <div className="flex items-center justify-center gap-1">
      <Link
        href={href(addMonths(month, -1))}
        aria-label="Mes anterior"
        className="flex size-11 items-center justify-center rounded-full"
      >
        <svg {...chevron}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </Link>
      <Link
        href={href(currentMonth)}
        className={`text-[17px] font-semibold ${isCurrent ? "" : "underline decoration-line underline-offset-4"}`}
        aria-label={isCurrent ? undefined : "Volver al mes actual"}
      >
        {monthLabel(month)}
      </Link>
      <Link
        href={href(addMonths(month, 1))}
        aria-label="Mes siguiente"
        className="flex size-11 items-center justify-center rounded-full"
      >
        <svg {...chevron}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </div>
  );
}
