import Image from "next/image";
import Link from "next/link";
import { DemoLamina, DemoPlano, DemoTelefono } from "@/components/landing/DemoAnimada";
import "./landing.css";

import { enlaceSoporte } from "@/lib/soporte";
import { Cta, VistaLanding } from "@/components/landing/Cta";
import { PRECIO, PRECIO_PRIMER_MES } from "@/lib/oferta";

const PASOS = [
  { n: "1", t: "Mide", d: "Toma ancho, alto y fondo en la obra. Nada más." },
  { n: "2", t: "Dicta o escribe", d: "“Bajo de cocina de 80 con dos puertas”. La app llena todo sola." },
  { n: "3", t: "Envía", d: "Cotización al cliente, orden de corte al proveedor y orden de producción a tu operario, en PDF." },
];

const BENEFICIOS = [
  { t: "Lista de cortes exacta", d: "Cada pieza con su medida de corte, cantidad y qué cantos lleva. Sin errores de lápiz." },
  { t: "Láminas optimizadas", d: "Acomoda las piezas en la lámina para gastar menos tablero. Sabes cuántas comprar." },
  { t: "Precio en tiempo real", d: "Con TUS precios de tablero, canto y herrajes. Cambias una medida y el precio cambia al instante." },
  { t: "Planos paso a paso", d: "Vistas con medidas totales e interiores, vista explotada en 3D y el orden de armado para tu ayudante." },
  { t: "Perforaciones y tarugos", d: "Dónde va cada bisagra, tarugo y soporte, con qué broca, a qué distancia del borde y a qué profundidad." },
  { t: "Veta siempre vertical", d: "En melaminas de madera, todas las piezas salen con la veta hacia arriba. El proveedor ve el sentido dibujado en cada lámina." },
  { t: "Interior en melamina blanca", d: "Lo que no se ve (cajones por dentro, entrepaños detrás de puertas) sale en blanco, más barato. Cada color en sus propias láminas." },
  { t: "Clientes y seguimiento", d: "Cada cliente con sus proyectos. Te avisa cuando abre la cotización y te recuerda a quién escribirle hoy." },
  { t: "PDF para el proveedor", d: "La orden de corte lista para mandar al depósito que te corta y cantea." },
  { t: "Desde el celular", d: "Hecho para usarse en la obra, con una mano. También en el computador." },
];

/** Pantallas reales de la app (capturas de /app en un celular). */
const PANTALLAS = [
  { src: "/app/catalogo.webp", t: "Eliges el mueble o lo dictas", d: "Tocas el micrófono y dices “clóset de 1,50 por 2,10”." },
  { src: "/app/disenar-3d.webp", t: "Lo ves en 3D al instante", d: "Cambias una medida o un color y el mueble y el precio cambian solos." },
  { src: "/app/cortes.webp", t: "La lista de cortes sale sola", d: "Cada pieza con su medida de corte, ya descontado el canto." },
  { src: "/app/laminas.webp", t: "Sabes cuántas láminas comprar", d: "Las piezas acomodadas en la lámina, listas para el depósito." },
  { src: "/app/armado.webp", t: "Tu ayudante sabe cómo armarlo", d: "Plano con medidas y el armado paso a paso." },
  { src: "/app/proyectos.webp", t: "Cada cliente con sus trabajos", d: "La cocina, el clóset y el baño de un mismo cliente, guardados aparte." },
  { src: "/app/clientes.webp", t: "No se te enfría ningún cliente", d: "Te avisa cuando abre la cotización y a quién escribirle hoy." },
];

const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_2zkI0jM7sJ3yYe3PzFEgTYfZKSN";
/** Imágenes de referencia (generadas con IA) de gente usando la app. No son clientes reales ni testimonios. */
const PERSONAS = {
  dictando: { src: `${CDN}/hf_20261116_145852_0becd583-234b-4162-a4dc-103f83181b85.png`, alt: "Carpintera dictando las medidas de un mueble a su celular en el taller", t: "Dicta las medidas en la obra", d: "Sin libreta ni calculadora: hablas y la app llena todo." },
  pareja: { src: `${CDN}/hf_20261116_145851_d180d6be-7702-4f8a-b3b7-36ac4113b514.png`, alt: "Pareja mirando en un celular el clóset en 3D que les van a fabricar", t: "", d: "" },
  aprendiz: { src: `${CDN}/hf_20261116_145850_ca44da07-ee76-42e0-adae-dbbf54540b54.png`, alt: "Ayudante de carpintería siguiendo el plano de cortes en el celular junto a la sierra", t: "Tu ayudante corta sin preguntarte", d: "Le pasas la lista de cortes y el plano, y trabaja solo." },
  portatil: { src: `${CDN}/hf_20261116_145848_f5df1b79-c470-4855-802d-20237005503f.png`, alt: "Carpintero revisando una cotización en el portátil del taller", t: "En el celular o en el computador", d: "Tus muebles y precios, listos donde estés." },
  midiendo: { src: `${CDN}/hf_20261116_145853_e1d2a603-fe20-47a6-8a7f-dda27f3c0d0a.png`, alt: "Carpintero midiendo una pared mientras la clienta mira el librero en 3D en el celular", t: "Le das el precio antes de irte", d: "Mides, cotizas y el cliente ya ve su mueble en 3D." },
  manos: { src: `${CDN}/hf_20261116_145851_bde8af36-3931-4390-82de-f5aa89066506.png`, alt: "Manos girando con el dedo un mueble de baño en 3D en la pantalla del celular", t: "", d: "" },
};

function FotoPersona({ f, sizes, prioridad }: { f: { src: string; alt: string }; sizes: string; prioridad?: boolean }) {
  return <Image src={f.src} alt={f.alt} width={1024} height={1280} sizes={sizes} priority={prioridad} />;
}

const CATALOGO = ["Bajos de cocina", "Aéreos de cocina", "Despenseros", "Closets y roperos", "Zapateros", "Libreros y repisas", "Muebles de TV", "Escritorios", "Mesas de noche", "Cajoneras", "Aparadores", "Muebles de baño"];

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
  { p: "¿Qué pasa con mis datos si cambio de celular?", r: "Nada se pierde. Tus proyectos, clientes, precios y cotizaciones se guardan en tu cuenta. Entras con tu correo desde otro celular o el computador y está todo." },
  { p: "¿Mi operario va a entender los planos?", r: "Sí. La orden de producción trae cada pieza con su código, el plano con medidas, la vista explotada en 3D con líneas que señalan cada pieza y herraje, y dónde perforar con qué broca y a qué profundidad." },
  { p: "¿Puedo cotizar un mueble que el cliente vio en una foto?", r: "Sí. Tomas o subes la foto y la app busca el mueble más parecido de su catálogo, con medidas y colores estimados. Tú revisas las medidas antes de cotizar." },
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
      <VistaLanding />
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
              Mides, le dictas las medidas al celular y, antes de salir de la casa del cliente, <b>él ya ve su mueble en 3D con el precio</b>. Tú te quedas con la lista de cortes, las láminas y los herrajes.
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

      <section className="ld-sec ld-3d" aria-labelledby="ld-3d-t">
        <div className="ld-wrap ld-split">
          <div>
            <p className="ld-eyebrow">Lo que convence al cliente</p>
            <h2 id="ld-3d-t">Tu cliente ve su mueble en 3D antes de que cortes una sola pieza</h2>
            <p className="ld-sub">
              La gente no entiende un plano, pero entiende esto. Le muestras el clóset con sus medidas y sus colores, le abres las puertas y le das el precio <b>ahí mismo</b>. Así se cierran los trabajos.
            </p>
            <div className="ld-3d-fotos">
              <figure>
                <FotoPersona f={PERSONAS.pareja} sizes="(min-width: 900px) 240px, 45vw" />
              </figure>
              <figure>
                <FotoPersona f={PERSONAS.manos} sizes="(min-width: 900px) 240px, 45vw" />
              </figure>
            </div>
          </div>
          <figure className="ld-3d-video">
            <video autoPlay muted loop playsInline preload="metadata" poster="/app/closet-3d.jpg" aria-label="Clóset en 3D dentro de la app: gira y abre sus puertas">
              <source src="/app/closet-3d.mp4" type="video/mp4" />
            </video>
            <figcaption>Grabado directo de la app, sin editar</figcaption>
          </figure>
        </div>
      </section>

      <section className="ld-foto" aria-labelledby="ld-foto-t">
        <picture>
          <source type="image/webp" srcSet="/fotos/carpintero-midiendo-900.webp 900w, /fotos/carpintero-midiendo-1800.webp 1800w" sizes="100vw" />
          { }
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

      <section className="ld-sec ld-sec-claro" aria-labelledby="ld-dentro-t">
        <div className="ld-wrap">
          <p className="ld-eyebrow">Así se ve por dentro</p>
          <h2 id="ld-dentro-t">Esto es lo que vas a tener en tu celular</h2>
          <p className="ld-sub">Pantallas reales de la app con un clóset de 1,50 × 2,10. Desliza para verlas.</p>
        </div>
        <div className="ld-pantallas" role="list">
          {PANTALLAS.map((p, i) => (
            <figure key={p.src} role="listitem">
              <div className="ld-pantalla-marco">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={`Pantalla de la app: ${p.t}`} width={600} height={1298} loading="lazy" decoding="async" />
              </div>
              <figcaption>
                <span>{i + 1}</span>
                <b>{p.t}</b>
                <small>{p.d}</small>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="ld-sec" aria-labelledby="ld-gente-t">
        <div className="ld-wrap">
          <p className="ld-eyebrow">Hecha para gente de taller</p>
          <h2 id="ld-gente-t">No tienes que saber de computadores. Si mandas audios por WhatsApp, puedes usarla.</h2>
          <div className="ld-gente">
            {[PERSONAS.dictando, PERSONAS.midiendo, PERSONAS.aprendiz, PERSONAS.portatil].map((f) => (
              <figure key={f.src}>
                <FotoPersona f={f} sizes="(min-width: 900px) 270px, 80vw" />
                <figcaption>
                  <b>{f.t}</b>
                  <small>{f.d}</small>
                </figcaption>
              </figure>
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
            <p className="ld-sub">Cada mueble trae su plano con medidas totales e interiores, despiece y el orden de armado. Tu ayudante sabe qué hacer sin que estés encima.</p>
          </div>
        </div>
      </section>

      <section className="ld-sec ld-sec-claro" aria-labelledby="ld-prod-t">
        <div className="ld-wrap ld-split">
          <div>
            <p className="ld-eyebrow">Orden de producción</p>
            <h2 id="ld-prod-t">Tu operario sabe dónde va cada pieza y dónde perforar</h2>
            <p className="ld-sub">Un PDF para el taller con todo lo que necesita, sin que tengas que explicarle nada.</p>
            <ul className="ld-lista ld-lista-clara">
              <li>Vista explotada en 3D: una línea punteada lleva a cada pieza y a cada herraje</li>
              <li>Bisagras, tarugos y soportes con su broca, distancia al borde y profundidad</li>
              <li>Herrajes para revisar antes de empezar y control de cada etapa con firma</li>
            </ul>
          </div>
          <div className="ld-produccion">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/app/explotada.webp" alt="Vista explotada de un clóset con líneas punteadas al código de cada pieza y herraje" width={1250} height={600} loading="lazy" decoding="async" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/app/perforaciones.webp" alt="Plano de perforaciones de los laterales con tarugos, bisagras y soportes acotados" width={1250} height={840} loading="lazy" decoding="async" />
            <small>Páginas reales de la orden de producción</small>
          </div>
        </div>
      </section>

      <section className="ld-sec" aria-labelledby="ld-foto-ref-t">
        <div className="ld-wrap ld-split ld-split-inv">
          <figure className="ld-foto-ref">
            <div className="ld-pantalla-marco">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/app/foto-referencia.webp" alt="Pantalla de la app proponiendo un mueble de TV a partir de una foto de referencia" width={600} height={1298} loading="lazy" decoding="async" />
            </div>
          </figure>
          <div>
            <p className="ld-eyebrow">Nuevo</p>
            <h2 id="ld-foto-ref-t">¿El cliente te muestra una foto? Cópiala.</h2>
            <p className="ld-sub">
              Tomas o subes la foto del mueble que quiere y la app arma el más parecido de su catálogo, con medidas y colores. Tú revisas y cotizas en minutos.
            </p>
            <Cta />
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
              { }
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
            {PRECIO_PRIMER_MES ? (
              <>
                <h2>
                  {PRECIO_PRIMER_MES}
                  <small> el primer mes</small>
                </h2>
                <p className="ld-luego">Después {PRECIO}/mes. Cancela cuando quieras.</p>
              </>
            ) : (
              <h2>
                {PRECIO}
                <small>/mes</small>
              </h2>
            )}
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
        <Cta texto={PRECIO_PRIMER_MES ? `Primer mes por ${PRECIO_PRIMER_MES}` : `Empezar por ${PRECIO}/mes`} />
      </div>
    </div>
  );
}
