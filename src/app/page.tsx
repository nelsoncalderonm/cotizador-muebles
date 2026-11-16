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
  {
    p: "¿Puedo probarla antes de pagar?",
    r: "Sí, sin riesgo. Pagas y tienes 7 días de garantía: haz tus cotizaciones reales y, si no te sirve, pides el reembolso desde Hotmart y te devolvemos todo. Sin preguntas.",
  },
  { p: "¿Qué muebles trae?", r: "Bajos y aéreos de cocina, clóset, librero, mueble de TV, escritorio, mesa de noche, cajonera, zapatero y mueble de baño. Todos se ajustan a tus medidas, y cada mes agregamos más." },
  {
    p: "¿La lista de cortes le sirve a mi depósito?",
    r: "Sí. Tú pones el tamaño de la lámina (2440×1830 u otra), el grosor de la sierra, el refilado y el espesor del canto. La app descuenta el canto y te da las medidas de corte como las pide el depósito, en un PDF listo para mandar.",
  },
  { p: "¿Uso mis propios precios?", r: "Sí. Pones lo que te cobra tu proveedor por lámina, canto, corte y herrajes, tu mano de obra y tu ganancia, en tu moneda. La app hasta le arma el mensaje a tu proveedor para pedirle precios con las cantidades exactas." },
  { p: "¿Necesito saber de computadores?", r: "No. Si mandas notas de voz por WhatsApp, puedes usarla. Dictas “bajo de cocina de 80 con dos puertas” y la app llena todo. La primera vez te guía paso a paso." },
  { p: "¿Sirve para mi país?", r: "Sí. Eliges tu país y la app pone la moneda y precios de referencia que luego ajustas. Funciona en toda Latinoamérica." },
  { p: "¿Funciona en mi celular?", r: "Sí, en cualquier celular con internet, Android o iPhone, y también en el computador. No hay que instalar nada: se abre en el navegador y la puedes dejar en la pantalla de inicio como una app." },
  { p: "¿Qué pasa con mis datos si cambio de celular?", r: "Entras con tu correo desde cualquier equipo. Tus cotizaciones y precios quedan guardados en el celular donde trabajas; si cambias de equipo, escríbenos y te ayudamos a pasarlos." },
  { p: "¿Cómo pago?", r: "Con tarjeta débito o crédito, y en muchos países también con medios locales como PSE o Efecty. El pago lo procesa Hotmart, una plataforma segura usada por miles de negocios en Latinoamérica." },
  { p: "¿Cómo entro después de pagar?", r: "Abres la app, creas tu cuenta con el mismo correo con el que pagaste y listo. Te toma un minuto." },
  { p: "¿Puedo cancelar cuando quiera?", r: "Sí. Es mensual, sin contratos ni permanencia. Cancelas desde Hotmart y conservas el acceso hasta el final del mes que pagaste." },
];

/** Testimonios reales de carpinteros. Solo se muestra la sección cuando hay al menos uno: nunca inventarlos. */
const TESTIMONIOS: { nombre: string; ciudad: string; texto: string; foto?: string }[] = [];

function Garantia() {
  return (
    <div className="ld-garantia">
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      <p>
        <b>Garantía de 7 días.</b> Úsala con tus trabajos reales. Si no te sirve, te devolvemos el 100 %.
      </p>
    </div>
  );
}

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
            Entrar
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
            <p className="ld-mini">Pago seguro con Hotmart · Garantía de 7 días · Cancela cuando quieras</p>
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

      <section className="ld-foto" aria-labelledby="ld-foto-t">
        <picture>
          <source type="image/webp" srcSet="/fotos/carpintero-midiendo-900.webp 900w, /fotos/carpintero-midiendo-1800.webp 1800w" sizes="100vw" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/fotos/carpintero-midiendo-900.jpg"
            srcSet="/fotos/carpintero-midiendo-900.jpg 900w, /fotos/carpintero-midiendo-1800.jpg 1800w"
            sizes="100vw"
            alt="Carpintero marcando con lápiz una medida sobre una tabla, junto a la sierra ingletadora"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <div className="ld-wrap ld-foto-txt">
          <p className="ld-eyebrow">Hecho para el taller</p>
          <h2 id="ld-foto-t">Tú pones el metro y el lápiz. La app hace las cuentas.</h2>
          <p className="ld-sub">Pensada con carpinteros que trabajan en obra, con aserrín en las manos y el cliente esperando el precio.</p>
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

      <section className="ld-sec">
        <div className="ld-wrap ld-split">
          <div>
            <p className="ld-eyebrow">Te ves más profesional</p>
            <h2>Esto es lo que le llega a tu cliente</h2>
            <p className="ld-sub">Una cotización en PDF con tu nombre, el mueble en 3D, las medidas y el precio. Por WhatsApp, mientras todavía estás en la obra.</p>
            <ul className="ld-lista">
              <li>Tu logo y tus datos arriba</li>
              <li>El mueble en 3D con los colores que eligió</li>
              <li>Fotos de trabajos que ya hiciste, para que confíe en ti</li>
            </ul>
          </div>
          <figure className="ld-ejemplo">
            <picture>
              <source type="image/webp" srcSet="/fotos/ejemplo-cotizacion.webp" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/fotos/ejemplo-cotizacion.png" alt="Ejemplo de cotización en PDF con el mueble en 3D, medidas y total" loading="lazy" decoding="async" />
            </picture>
            <figcaption>Ejemplo real generado con la app</figcaption>
          </figure>
        </div>
      </section>

      {TESTIMONIOS.length > 0 && (
        <section className="ld-sec">
          <div className="ld-wrap">
            <p className="ld-eyebrow">Lo dicen carpinteros</p>
            <h2>Ya cotizan con INNER Muebles</h2>
            <div className="ld-testimonios">
              {TESTIMONIOS.map((t) => (
                <figure key={t.nombre}>
                  <blockquote>“{t.texto}”</blockquote>
                  <figcaption>
                    {t.foto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.foto} alt="" loading="lazy" />
                    )}
                    <span>
                      <b>{t.nombre}</b>
                      <small>{t.ciudad}</small>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

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
            <p className="ld-sub">Una sola lámina de melamina cuesta más que un mes de INNER Muebles. Si te ahorra una lámina o un herraje olvidado, ya se pagó.</p>
            <ul>
              <li>Muebles y cotizaciones ilimitadas</li>
              <li>Dictado por voz incluido</li>
              <li>PDF de cortes, cotización y planos</li>
              <li>Tus precios y tu moneda</li>
              <li>Nuevos muebles cada mes</li>
            </ul>
            <Cta grande texto="Empezar ahora" />
            <Garantia />
            <p className="ld-mini">Pago seguro con Hotmart · Sin permanencia</p>
          </div>
        </div>
      </section>

      <section className="ld-sec">
        <div className="ld-wrap ld-faq">
          <p className="ld-eyebrow">Antes de comprar</p>
          <h2>Preguntas frecuentes</h2>
          {FAQ.map((f) => (
            <details key={f.p}>
              <summary>{f.p}</summary>
              <p>{f.r}</p>
            </details>
          ))}
          <div className="ld-faq-cta">
            <Cta texto={`Probar 7 días con garantía`} />
          </div>
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
