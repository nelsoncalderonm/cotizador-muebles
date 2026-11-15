// WhatsApp de soporte de INNER Muebles.
export const SOPORTE_WHATSAPP = "573135935170";

export const enlaceSoporte = (mensaje: string) => `https://wa.me/${SOPORTE_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
