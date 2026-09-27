import { renderAppIcon } from "@/lib/app-icon";

// /icon/192 y /icon/512: los usa el manifest (Android y navegadores).
export function generateImageMetadata() {
  return [192, 512].map((size) => ({
    id: String(size),
    size: { width: size, height: size },
    contentType: "image/png",
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  return renderAppIcon(Number(await id));
}
