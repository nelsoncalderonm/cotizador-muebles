"use client";
// Botones de la página de gracias. Si Hotmart manda el correo del comprador en el enlace
// (?email=… o ?correo=…), lo mostramos y lo dejamos escrito en el formulario de registro.

import { useEffect, useState } from "react";
import { enlaceSoporte } from "@/lib/soporte";

function useCorreoCompra() {
  const [correo, setCorreo] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = (q.get("email") || q.get("correo") || q.get("buyer_email") || "").trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) setCorreo(c);
  }, []);
  return correo;
}

export function CorreoCompra() {
  const correo = useCorreoCompra();
  if (!correo) return null;
  return (
    <p className="gr-correo">
      Tu correo de compra: <b>{correo}</b>
    </p>
  );
}

export function BotonCrearCuenta() {
  const correo = useCorreoCompra();
  const href = `/app?crear=1${correo ? `&correo=${encodeURIComponent(correo)}` : ""}`;
  return (
    <div className="gr-boton">
      <a className="ld-cta ld-cta-grande" href={href}>
        Crear mi cuenta ahora
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </a>
    </div>
  );
}

export function BotonWhatsApp() {
  const correo = useCorreoCompra();
  const mensaje = `Hola, acabo de comprar INNER Muebles y tengo una duda.${correo ? ` Mi correo de compra es ${correo}.` : ""}`;
  return (
    <a className="gr-btn-wa" href={enlaceSoporte(mensaje)} target="_blank" rel="noreferrer">
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z" />
      </svg>
      Escribir por WhatsApp
    </a>
  );
}
