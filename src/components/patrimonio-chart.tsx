"use client";

import { useRef, useState } from "react";
import { formatEUR, formatShortDate } from "@/lib/format";
import type { EvoPoint } from "@/lib/evolucion";

const W = 340;
const H = 180;
const PAD = { top: 12, right: 52, bottom: 24, left: 6 };

const monthShort = new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" });
const monthLong = new Intl.DateTimeFormat("es-ES", { month: "long", timeZone: "UTC" });
const short = (m: string) => monthShort.format(new Date(`${m}-01T00:00:00Z`)).replace(".", "");
const long = (m: string) => monthLong.format(new Date(`${m}-01T00:00:00Z`));
const tickFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });

// Marcas "redondas" del eje Y (1, 2, 2,5 o 5 × 10^n).
function niceTicks(min: number, max: number, count = 3) {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * pow).find((s) => s >= raw)!;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  return ticks;
}

function pointLabel(p: EvoPoint, today: string) {
  if (p.kind === "hoy") return `Hoy, ${formatShortDate(today)}`;
  if (p.kind === "cierre") return `Fin de ${long(p.month)}`;
  return `Fin de ${long(p.month)} · proyectado`;
}

export function PatrimonioChart({
  points,
  today,
  hidden,
}: {
  points: EvoPoint[];
  today: string;
  hidden: boolean;
}) {
  const hoyIndex = points.findIndex((p) => p.kind === "hoy");
  const [sel, setSel] = useState(hoyIndex);
  const svgRef = useRef<SVGSVGElement>(null);

  const ticks = niceTicks(
    Math.min(...points.map((p) => p.total)),
    Math.max(...points.map((p) => p.total)),
  );
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const xMin = Math.min(...points.map((p) => p.x));
  const xMax = Math.max(...points.map((p) => p.x));
  const sx = (x: number) =>
    PAD.left + ((x - xMin) / (xMax - xMin || 1)) * (W - PAD.left - PAD.right);
  const sy = (v: number) =>
    PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD.top - PAD.bottom);

  const real = points.slice(0, hoyIndex + 1);
  const proj = points.slice(hoyIndex);
  const line = (ps: EvoPoint[]) =>
    ps.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.total).toFixed(1)}`).join("");
  const area = (ps: EvoPoint[]) =>
    ps.length > 1
      ? `${line(ps)}L${sx(ps[ps.length - 1].x).toFixed(1)},${H - PAD.bottom}L${sx(ps[0].x).toFixed(1)},${H - PAD.bottom}Z`
      : "";

  function pick(clientX: number) {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const vx = ((clientX - box.left) / box.width) * W;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(sx(p.x) - vx) < Math.abs(sx(points[best].x) - vx)) best = i;
    });
    setSel(best);
  }

  const p = points[sel];
  const prev = sel > 0 ? points[sel - 1] : null;
  const delta = prev ? p.total - prev.total : null;
  // Etiquetas del eje X: una por mes, en su cierre (el de "hoy" solo si hoy es fin de mes).
  const monthTicks = points.filter(
    (q) => q.kind !== "hoy" || !points.some((r) => r.kind === "fin-de-mes"),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col" aria-live="polite">
        <div className="text-[13px] text-muted">{pointLabel(p, today)}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-semibold">
            {hidden ? "•••• €" : formatEUR(p.total)}
          </span>
          {delta !== null && !hidden && (
            <span className={`text-[15px] ${delta < 0 ? "text-negative" : "text-accent"}`}>
              {delta < 0 ? "−" : "+"}
              {formatEUR(Math.abs(delta))}
            </span>
          )}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y overflow-visible outline-none select-none"
        role="img"
        aria-label="Evolución del patrimonio a fin de cada mes, con proyección punteada"
        tabIndex={0}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerMove={(e) => (e.pointerType === "mouse" || e.buttons) && pick(e.clientX)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setSel((s) => Math.max(0, s - 1));
          if (e.key === "ArrowRight") setSel((s) => Math.min(points.length - 1, s + 1));
        }}
      >
        <defs>
          <linearGradient id="evo-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="evo-fill-proj" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.08" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} stroke="var(--line-soft)" strokeWidth="1" />
            {!hidden && (
              <text x={W - PAD.right + 6} y={sy(t) + 4} fontSize="11" fill="var(--muted)">
                {tickFormat.format(t)}
              </text>
            )}
          </g>
        ))}

        {monthTicks.map((q) => (
          <text
            key={q.month}
            x={sx(q.x)}
            y={H - 6}
            fontSize="11"
            textAnchor="middle"
            fill="var(--muted)"
          >
            {short(q.month)}
          </text>
        ))}

        <path d={area(real)} fill="url(#evo-fill)" />
        <path d={area(proj)} fill="url(#evo-fill-proj)" />
        <path d={line(real)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {proj.length > 1 && (
          <path d={line(proj)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 5" strokeLinejoin="round" strokeLinecap="round" />
        )}

        <line x1={sx(p.x)} x2={sx(p.x)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--line)" strokeWidth="1" />

        {points.map((q, i) =>
          q.kind === "cierre" || q.kind === "hoy" || i === sel ? (
            <circle
              key={i}
              cx={sx(q.x)}
              cy={sy(q.total)}
              r={i === sel ? 5.5 : 4}
              fill={q.kind === "proyeccion" || q.kind === "fin-de-mes" ? "var(--card)" : "var(--accent)"}
              stroke={q.kind === "proyeccion" || q.kind === "fin-de-mes" ? "var(--accent)" : "var(--card)"}
              strokeWidth="2"
            />
          ) : null,
        )}
      </svg>
    </div>
  );
}
