// Píxel de Meta: mide visitas, intentos de compra y registros para que los anuncios aprendan quién compra.
export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL || "1051219463720011";

type Fbq = (accion: "track" | "trackCustom", evento: string, datos?: Record<string, unknown>) => void;

export function evento(nombre: string, datos?: Record<string, unknown>) {
  try {
    const fbq = (window as unknown as { fbq?: Fbq }).fbq;
    fbq?.("track", nombre, datos);
  } catch {
    /* bloqueado por el navegador */
  }
}
