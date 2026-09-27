import { renderAppIcon } from "@/lib/app-icon";

// Ícono de "Añadir a pantalla de inicio" en el iPhone.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppIcon(180);
}
