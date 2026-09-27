import { cookies } from "next/headers";
import { formatEUR } from "./format";

// "Ocultar saldos": se guarda en una cookie para que el servidor ya renderice oculto.
export const HIDDEN_COOKIE = "ocultar";

export async function isHidden() {
  return (await cookies()).get(HIDDEN_COOKIE)?.value === "1";
}

// Importe con signo opcional, o "•••• €" si los saldos están ocultos.
export function money(amount: number, hidden: boolean, sign: "" | "+" | "−" = "") {
  return hidden ? "•••• €" : `${sign}${formatEUR(amount)}`;
}
