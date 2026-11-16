// Oferta de la landing. El cupón solo se muestra si NEXT_PUBLIC_CUPON está configurado,
// para no prometer un precio que el checkout no cobra.
export const CHECKOUT = process.env.NEXT_PUBLIC_CHECKOUT_URL || "https://pay.hotmart.com/M108507757C";
export const PRECIO = process.env.NEXT_PUBLIC_PRECIO || "US$15";
export const CUPON = process.env.NEXT_PUBLIC_CUPON || "";
export const PRECIO_PRIMER_MES = CUPON ? process.env.NEXT_PUBLIC_PRECIO_PRIMER_MES || "US$9" : "";
// Hotmart aplica el cupón solo con el parámetro offDiscount en el enlace del checkout
export const CHECKOUT_FINAL = CUPON ? `${CHECKOUT}${CHECKOUT.includes("?") ? "&" : "?"}offDiscount=${encodeURIComponent(CUPON)}` : CHECKOUT;
