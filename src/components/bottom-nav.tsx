"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// href null = pantalla todavía no construida: se muestra en gris y no navega.
const TABS = [
  {
    href: "/",
    label: "Inicio",
    svg: (
      <svg {...icon}>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    href: "/movimientos",
    label: "Movimientos",
    svg: (
      <svg {...icon}>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <circle cx="4" cy="6" r="1" />
        <circle cx="4" cy="12" r="1" />
        <circle cx="4" cy="18" r="1" />
      </svg>
    ),
  },
  null, // botón +
  {
    href: "/recurrentes",
    label: "Recurrentes",
    svg: (
      <svg {...icon}>
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    ),
  },
  {
    href: "/patrimonio",
    label: "Patrimonio",
    svg: (
      <svg {...icon}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-[#e4e0d7] bg-white pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-3">
        {TABS.map((tab, i) => {
          if (!tab)
            return (
              <Link
                key={i}
                href="/cargar"
                aria-label="Cargar movimiento"
                className="flex size-[52px] items-center justify-center justify-self-center rounded-full bg-accent text-white"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </Link>
            );
          const content = (
            <>
              {tab.svg}
              {tab.label}
            </>
          );
          const cls = "flex flex-col items-center gap-0.5 text-[11px]";
          if (!tab.href)
            return (
              <span key={i} aria-disabled="true" className={`${cls} text-muted/40`}>
                {content}
              </span>
            );
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={i}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`${cls} ${active ? "text-accent" : "text-muted"}`}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
