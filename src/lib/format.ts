// Formato español: 1.234,56 €. useGrouping "always" porque es-ES no agrupa
// los números de 4 cifras por defecto (daría 1234,56).
const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always",
});

export function formatEUR(amount: number) {
  return eur.format(amount);
}

// "24,50", "24.50", "1.234,5" o "1234" → número. null si no es un importe válido.
export function parseAmount(input: string): number | null {
  let s = input.replace(/[\s€]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}

// Fecha de hoy en Barcelona como "YYYY-MM-DD", sin depender de la zona del servidor.
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(
    new Date(),
  );
}

// "2026-10-12" → "12 oct". Las fechas se tratan como UTC para no correrse un día.
export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${iso}T00:00:00Z`))
    .replace(".", "");
}
