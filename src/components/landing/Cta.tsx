"use client";
// Botón de compra: lleva al checkout de Hotmart (con el cupón de primer mes si está activo) y avisa al píxel.

import { evento } from "@/lib/pixel";
import { CHECKOUT_FINAL, PRECIO_PRIMER_MES, PRECIO } from "@/lib/oferta";

export function Cta({ texto, grande = false }: { texto?: string; grande?: boolean }) {
  const t = texto ?? (PRECIO_PRIMER_MES ? `Empezar por ${PRECIO_PRIMER_MES} el primer mes` : `Quiero INNER Muebles por ${PRECIO}/mes`);
  return (
    <a
      className={`ld-cta${grande ? " ld-cta-grande" : ""}`}
      href={CHECKOUT_FINAL}
      onClick={() => evento("InitiateCheckout", { currency: "USD", value: Number((PRECIO_PRIMER_MES || PRECIO).replace(/[^\d.]/g, "")) || 15, content_name: "INNER Muebles" })}
    >
      {t}
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </a>
  );
}

/** Marca la visita a la landing como interés en el producto. */
export function VistaLanding() {
  if (typeof window !== "undefined") {
    // una sola vez por carga
    const w = window as unknown as { __vistaInner?: boolean };
    if (!w.__vistaInner) {
      w.__vistaInner = true;
      setTimeout(() => evento("ViewContent", { content_name: "INNER Muebles", currency: "USD", value: 15 }), 1500);
    }
  }
  return null;
}
