// Página de gracias: a donde Hotmart manda al comprador después de pagar.
// Explica en cuatro pasos cómo entrar (crear la cuenta con el MISMO correo de la compra)
// y deja el WhatsApp de soporte a la vista para cualquier duda.

import type { Metadata } from "next";
import Link from "next/link";
import "../landing.css";

import { BotonCrearCuenta, BotonWhatsApp, CorreoCompra } from "./Acciones";

export const metadata: Metadata = {
  title: "¡Gracias por tu compra! · INNER Muebles",
  description: "Así entras a INNER Muebles después de pagar.",
  robots: { index: false, follow: false },
};

const PASOS = [
  {
    t: "Busca el correo de Hotmart",
    d: "En unos minutos te llega el recibo de tu compra. Fíjate a qué correo te llegó: ese es tu correo de acceso. Si no lo ves, revisa Spam o Promociones.",
  },
  {
    t: "Crea tu cuenta con ese mismo correo",
    d: "Toca el botón verde, elige “Crear cuenta”, escribe el correo con el que pagaste y una contraseña que recuerdes (mínimo 6 letras o números).",
  },
  {
    t: "Confirma tu correo",
    d: "Te enviamos un correo para confirmar que es tuyo. Ábrelo y toca el enlace. Es para que nadie más pueda entrar con tu cuenta.",
  },
  {
    t: "Entra y cotiza tu primer mueble",
    d: "Vuelve a la app, entra con tu correo y contraseña, y la primera vez te guía paso a paso para poner tus precios.",
  },
];

const DUDAS = [
  {
    p: "¿Por qué tiene que ser el mismo correo?",
    r: "Porque así sabemos que tú eres quien pagó. Hotmart nos avisa del pago con el correo que escribiste en la compra, y la app te da acceso cuando creas la cuenta con ese correo. Si usas otro, la app no te reconoce.",
  },
  {
    p: "Me registré con otro correo, ¿qué hago?",
    r: "Tranquilo, no pierdes nada. Escríbenos por WhatsApp con el correo de la compra y el que usaste para registrarte, y lo arreglamos en minutos.",
  },
  {
    p: "No me llega el correo de confirmación",
    r: "Espera un par de minutos y revisa Spam, Promociones o Correo no deseado. Si después de 10 minutos no aparece, escríbenos por WhatsApp y te ayudamos.",
  },
  {
    p: "Pagué con PSE, Efecty o en efectivo",
    r: "Tu acceso se activa cuando Hotmart confirma el pago. Con tarjeta es al instante; con efectivo puede tardar hasta uno o dos días hábiles. Puedes crear tu cuenta desde ya y entrar cuando el pago quede aprobado.",
  },
  {
    p: "Creé la cuenta y me dice que mi suscripción no está activa",
    r: "Casi siempre es porque el pago aún se está confirmando o porque usaste un correo distinto al de la compra. Escríbenos por WhatsApp y lo revisamos contigo.",
  },
  {
    p: "¿Tengo que instalar algo?",
    r: "No. La app se abre en el navegador del celular o del computador. Si quieres tenerla a mano, en el menú del navegador toca “Agregar a la pantalla de inicio” y te queda como un ícono más.",
  },
  {
    p: "¿Y si no me sirve?",
    r: "Tienes 7 días de garantía. Si no te convence, pides el reembolso desde Hotmart y te devolvemos todo. También puedes cancelar cuando quieras: es mensual, sin permanencia.",
  },
];

function Check() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export default function Gracias() {
  return (
    <div className="ld gr">
      <header className="ld-top">
        <div className="ld-wrap ld-top-in">
          <div className="ld-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/inner-logo-blanco.png" alt="INNER" />
            <i aria-hidden />
            <b>Muebles</b>
          </div>
          <Link href="/app" className="ld-top-link">
            Entrar
          </Link>
        </div>
      </header>

      <main className="ld-wrap gr-main">
        <section className="gr-hero">
          <div className="gr-sello">
            <Check />
          </div>
          <p className="ld-eyebrow">Compra recibida</p>
          <h1>¡Gracias! Ya eres parte de INNER Muebles</h1>
          <p className="ld-sub">
            Te falta <b>un solo paso</b>: crear tu cuenta. Toma un minuto.
          </p>
        </section>

        <section className="gr-clave" aria-label="Importante">
          <b>Lo más importante</b>
          <p>
            Crea tu cuenta con <b>el mismo correo con el que pagaste en Hotmart</b>. Así la app sabe que eres tú y te da acceso.
          </p>
          <CorreoCompra />
        </section>

        <BotonCrearCuenta />

        <section className="gr-pasos">
          <h2>Así entras, paso a paso</h2>
          <ol>
            {PASOS.map((p, i) => (
              <li key={p.t}>
                <span className="gr-num">{i + 1}</span>
                <div>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="gr-wa">
          <div>
            <h2>¿Tienes alguna duda? Escríbenos</h2>
            <p>Te atiende una persona del equipo por WhatsApp. Si algo no te funciona, lo resolvemos contigo. No te quedas solo.</p>
          </div>
          <BotonWhatsApp />
        </section>

        <section className="ld-faq gr-faq">
          <h2>Preguntas frecuentes</h2>
          {DUDAS.map((f) => (
            <details key={f.p}>
              <summary>{f.p}</summary>
              <p>{f.r}</p>
            </details>
          ))}
        </section>

        <div className="ld-garantia gr-garantia">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <p>
            <b>Compra protegida.</b> Pagaste con Hotmart y tienes 7 días de garantía. Si no te sirve, te devolvemos el dinero.
          </p>
        </div>
      </main>

      <footer className="ld-pie">
        <div className="ld-wrap">
          <span>© {new Date().getFullYear()} INNER</span>
          <Link href="/app">Abrir la app</Link>
        </div>
      </footer>
    </div>
  );
}
