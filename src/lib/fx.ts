// Cambio USD→EUR del Banco Central Europeo vía Frankfurter (gratis, sin clave).
// Se cachea 1 hora. Si falla, devuelve null y se usa el último cambio guardado.
export async function usdToEur(): Promise<{ rate: number; date: string } | null> {
  try {
    const res = await fetch(
      "https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR",
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { date: string; rates: { EUR: number } };
    return data.rates?.EUR ? { rate: data.rates.EUR, date: data.date } : null;
  } catch {
    return null;
  }
}
