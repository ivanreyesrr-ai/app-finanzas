import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Ícono de la app: "€" en Instrument Serif, crema sobre el verde de acento.
// Cuadrado sin redondear: iOS y Android aplican su propia máscara.
export async function renderAppIcon(size: number) {
  const font = await readFile(join(process.cwd(), "src/assets/InstrumentSerif-Regular.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1F5E4A",
          color: "#F5F3EE",
          fontFamily: "Instrument Serif",
          fontSize: size * 0.62,
          lineHeight: 1,
          paddingBottom: size * 0.04,
        }}
      >
        €
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [{ name: "Instrument Serif", data: font, style: "normal", weight: 400 }],
    },
  );
}
