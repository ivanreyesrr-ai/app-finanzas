// Retribución flexible: el ciclo va del día 20 al 19 del mes siguiente.

function iso(y: number, m: number, d: number) {
  // m en base 0; Date.UTC normaliza meses fuera de rango (ej. -1 → diciembre anterior).
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
}

// Ciclo que contiene la fecha dada: { start: "YYYY-MM-20", end: "YYYY-MM-19" }.
export function flexCycle(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const startMonth = d >= 20 ? m - 1 : m - 2;
  return { start: iso(y, startMonth, 20), end: iso(y, startMonth + 1, 19) };
}
