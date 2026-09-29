"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TABS = [
  {
    href: "/",
    label: "Inicio",
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 3.2 2.8 11.4a.8.8 0 0 0 .5 1.4H5V20a1 1 0 0 0 1 1h4v-5.5h4V21h4a1 1 0 0 0 1-1v-7.2h1.7a.8.8 0 0 0 .5-1.4z" />
      </svg>
    ),
  },
  {
    href: "/movimientos",
    label: "Movimientos",
    svg: (
      <svg {...icon} aria-hidden="true">
        <line x1="9" y1="6.5" x2="20" y2="6.5" />
        <line x1="9" y1="12" x2="20" y2="12" />
        <line x1="9" y1="17.5" x2="20" y2="17.5" />
        <circle cx="4.5" cy="6.5" r="1.2" fill="currentColor" />
        <circle cx="4.5" cy="12" r="1.2" fill="currentColor" />
        <circle cx="4.5" cy="17.5" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  null, // botón +
  {
    href: "/recurrentes",
    label: "Recurrentes",
    svg: (
      <svg {...icon} aria-hidden="true">
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
      <svg {...icon} aria-hidden="true">
        <rect x="3" y="7" width="18" height="13" rx="2.5" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
];

// Barra de pestañas estilo iOS: translúcida con desenfoque y el + al centro.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t-[0.5px] border-line bg-bar pb-[max(env(safe-area-inset-bottom),10px)] backdrop-blur-xl backdrop-saturate-[1.8]">
      <div className="mx-auto grid max-w-md grid-cols-5 items-start px-2 pt-1.5">
        {TABS.map((tab, i) => {
          if (!tab)
            return (
              <Link
                key={i}
                href="/cargar"
                aria-label="Cargar movimiento"
                className="flex size-[50px] items-center justify-center justify-self-center rounded-full bg-accent text-on-accent shadow-[0_4px_12px_rgba(31,94,74,0.35)]"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </Link>
            );
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={i}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 pt-0.5 text-[10px] font-medium ${active ? "text-accent" : "text-muted"}`}
            >
              {tab.svg}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
