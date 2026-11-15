import Link from "next/link";
import { DemoLamina, DemoPlano, DemoTelefono } from "@/components/landing/DemoAnimada";
import "./landing.css";

import { enlaceSoporte } from "@/lib/soporte";
// Checkout de Hotmart (plan mensual). Se puede cambiar con NEXT_PUBLIC_CHECKOUT_URL sin tocar código.
const CHECKOUT = process.env.NEXT_PUBLIC_CHECKOUT_URL || "https://pay.hotmart.com/M108507757C";
const PRECIO = process.env.NEXT_PUBLIC_PRECIO || "US$15";

function Cta({ texto = `Quiero INNER Muebles por ${PRECIO}/mes`, grande = false }: { texto?: string; grande?: boolean }) {
  return (
    <a className={`ld-cta${grande ? " ld-cta-grande" : ""}`} href={CHECKOUT}>
      {texto}
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </a>
  );
}

const PASOS = [
  { n: "1", t: "Mide", d: "Toma ancho, alto y fondo en la obra. Nada más." },
  { n: "2", t: "Dicta o escribe", d: "“Bajo de cocina de 80 con dos puertas”. La app llena todo sola." },
  { n: "3", t: "Envía", d: "Cotización al cliente y orden de corte al proveedor, en PDF, por WhatsApp." },
];

const BENEFICIOS = [
  { t: "Lista de cortes exacta", d: "Cada pieza con su medida de corte, cantidad y qué cantos lleva. Sin errores de lápiz." },
  { t: "Láminas optimizadas", d: "Acomoda las piezas en la lámina para gastar menos tablero. Sabes cuántas comprar." },
  { t: "Precio en tiempo real", d: "Con TUS precios de tablero, canto y herrajes. Cambias una medida y el precio cambia al instante." },
  { t: "Planos paso a paso", d: "Vistas con medidas y el orden de armado para tu ayudante." },
  { t: "PDF para el proveedor", d: "La orden de corte lista para mandar al depósito que te corta y cantea." },
  { t: "Desde el celular", d: "Hecho para usarse en la obra, con una mano. También en el computador." },
];

const CATALOGO = ["Bajos de cocina", "Aéreos de cocina", "Closets y roperos", "Libreros y repisas", "Escritorios", "Mesas de noche", "Cajoneras"];

const FAQ = [
  { p: "¿Necesito saber de computadores?", r: "No. Si mandas notas de voz por WhatsApp, puedes usar INNER Muebles. Dictas las medidas y listo." },
  { p: "¿Sirve para mi país?", r: "Sí. Tú pones la moneda, el tamaño de lámina y tus precios. Funciona en toda Latinoamérica." },
  { p: "¿Qué pasa si no me gusta?", r: "Tienes 7 días de garantía. Si no te sirve, te devolvemos el dinero completo." },
  { p: "¿Puedo cancelar cuando quiera?", r: "Sí. Es mensual, sin contratos ni permanencia." },
];

export default function Landing() {
  return (
    <div className="ld">
      <header className="ld-top">
        <div className="ld-wrap ld-top-in">
          <div className="ld-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/inner-logo-blanco.png" alt="INNER" />
            <i aria-hidden />
            <b>Muebles</b>
          </div>
          <Link href="/app" className="ld-top-link">
            Probar la app
          </Link>
        </div>
      </header>

      <section className="ld-hero">
        <div className="ld-wrap ld-hero-in">
          <div className="ld-hero-txt">
            <p className="ld-eyebrow">Para carpinteros que fabrican en melamina</p>
            <h1>
              Cotiza un mueble en <span>5 minutos</span> desde tu celular
            </h1>
            <p className="ld-sub">
              Mides, dictas las medidas y la app te da <b>la lista de cortes, las láminas que necesitas, los herrajes y el precio</b>. Lista para mandar por WhatsApp.
            </p>
            <Cta grande />
            <p className="ld-mini">Garantía de 7 días · Cancela cuando quieras</p>
          </div>
          <DemoTelefono />
        </div>
      </section>

      <section className="ld-dolor">
        <div className="ld-wrap ld-vs">
          <div className="ld-vs-col ld-antes">
            <h3>Antes</h3>
            <ul>
              <li>2 horas con lápiz y calculadora por cotización</li>
              <li>Piezas mal medidas que se pierden</li>
              <li>Compras láminas de más (o te faltan)</li>
              <li>Cobras de menos porque olvidaste herrajes</li>
            </ul>
          </div>
          <div className="ld-vs-col ld-ahora">
            <h3>Con INNER Muebles</h3>
            <ul>
              <li>Cotización en 5 minutos, en la obra</li>
              <li>Cortes exactos con descuento de canto</li>
              <li>Sabes cuántas láminas comprar</li>
              <li>Cada tornillo y bisagra en el precio</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="ld-sec">
        <div className="ld-wrap">
          <p className="ld-eyebrow">Así de fácil</p>
          <h2>Mide. Dicta. Envía.</h2>
          <div className="ld-pasos">
            {PASOS.map((p) => (
              <div key={p.n} className="ld-paso">
                <span>{p.n}</span>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ld-sec ld-sec-claro">
        <div className="ld-wrap ld-split">
          <div>
            <p className="ld-eyebrow">Menos desperdicio</p>
            <h2>La app acomoda las piezas en la lámina por ti</h2>
            <p className="ld-sub">Cocina de 5 módulos: estas son sus piezas en la lámina de 2440×1830. El mismo mapa que le mandas a tu proveedor de corte.</p>
            <Cta />
          </div>
          <DemoLamina />
        </div>
      </section>

      <section className="ld-sec">
        <div className="ld-wrap ld-split ld-split-inv">
          <DemoPlano />
          <div>
            <p className="ld-eyebrow">Planos de fabricación</p>
            <h2>Planos con medidas y armado paso a paso</h2>
            <p className="ld-sub">Cada mueble trae su plano con cotas, despiece y el orden de armado. Tu ayudante sabe qué hacer sin que estés encima.</p>
          </div>
        </div>
      </section>

      <section className="ld-sec ld-sec-claro">
        <div className="ld-wrap">
          <p className="ld-eyebrow">Todo lo que necesitas</p>
          <h2>Del metro a la cotización, sin calculadora</h2>
          <div className="ld-grid">
            {BENEFICIOS.map((b) => (
              <div key={b.t} className="ld-card">
                <h3>{b.t}</h3>
                <p>{b.d}</p>
              </div>
            ))}
          </div>
          <div className="ld-chips">
            {CATALOGO.map((c) => (
              <span key={c}>{c}</span>
            ))}
            <span className="ld-chip-mas">y más cada mes</span>
          </div>
        </div>
      </section>

      <section className="ld-sec ld-precio-sec" id="precio">
        <div className="ld-wrap">
          <div className="ld-precio">
            <p className="ld-eyebrow">Un solo plan</p>
            <h2>
              {PRECIO}
              <small>/mes</small>
            </h2>
            <p className="ld-sub">Menos de lo que pierdes en una sola lámina mal cortada.</p>
            <ul>
              <li>Muebles y cotizaciones ilimitadas</li>
              <li>Dictado por voz incluido</li>
              <li>PDF de cortes, cotización y planos</li>
              <li>Tus precios y tu moneda</li>
              <li>Nuevos muebles cada mes</li>
            </ul>
            <Cta grande texto="Empezar ahora" />
            <p className="ld-mini">Pago seguro con Hotmart · Garantía de 7 días</p>
          </div>
        </div>
      </section>

      <section className="ld-sec">
        <div className="ld-wrap ld-faq">
          <h2>Preguntas frecuentes</h2>
          {FAQ.map((f) => (
            <details key={f.p}>
              <summary>{f.p}</summary>
              <p>{f.r}</p>
            </details>
          ))}
          <p className="ld-duda">
            ¿Te quedó alguna duda?{" "}
            <a href={enlaceSoporte("Hola, tengo una pregunta sobre INNER Muebles.")} target="_blank" rel="noreferrer">
              Escríbenos por WhatsApp
            </a>
          </p>
        </div>
      </section>

      <footer className="ld-pie">
        <div className="ld-wrap">
          <span>© {new Date().getFullYear()} INNER</span>
          <Link href="/app">Abrir la app</Link>
        </div>
      </footer>

      <div className="ld-sticky">
        <Cta texto={`Empezar por ${PRECIO}/mes`} />
      </div>
    </div>
  );
}
