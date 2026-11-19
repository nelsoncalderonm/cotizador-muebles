"use client";

import { InputNumero } from "./InputNumero";
import { useEffect, useMemo, useState } from "react";
import { perforaciones } from "@/lib/motor/perforaciones";
import { PlanoPerforacion } from "./PlanoPerforacion";
import { formatoDinero, mm, useEstado } from "@/lib/estado";
import { precioHerraje, textoCantos } from "@/lib/motor/proyecto";
import { LaminaSvg } from "./LaminaSvg";
import { VistaMueble } from "./VistaMueble";
import { colorMueble } from "@/lib/colores";
import { useCotizaciones } from "@/lib/cotizaciones";
import { useFotos } from "@/lib/fotos";
import { esPuerta } from "@/lib/motor/constructor";
import { cuentasActivas, supabase } from "@/lib/supabase";
import { condiciones, mensajeCliente, numeroCotizacion, pagos, validaHasta } from "@/lib/cotizacion";

function Vacio() {
  return (
    <div className="vacio">
      <svg viewBox="0 0 48 48" aria-hidden>
        <path d="M8 40V12h32v28M8 22h32M24 12v28M17 17h2M29 17h2" />
      </svg>
      <strong>Aún no hay muebles</strong>
      <p>Elige un mueble y pon sus medidas. Aquí verás los cortes, las láminas y la cotización.</p>
      <a className="btn" href="#disenar">
        Elegir un mueble
      </a>
    </div>
  );
}

export function BotonPdf({ etiqueta, generar, principal }: { etiqueta: string; generar: () => Promise<void>; principal?: boolean }) {
  const [ocupado, setOcupado] = useState(false);
  return (
    <button
      className={principal ? "btn" : "btn-sec"}
      disabled={ocupado}
      aria-busy={ocupado}
      onClick={async () => {
        setOcupado(true);
        try {
          await generar();
        } finally {
          setOcupado(false);
        }
      }}
    >
      {ocupado && <i className="girando" aria-hidden />}
      {ocupado ? "Generando…" : etiqueta}
    </button>
  );
}

function nombreArchivo(base: string, proyecto: string) {
  const limpio = (proyecto || "proyecto").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  return `${base}-${limpio}.pdf`;
}

export function useAccionesPdf() {
  const { resultado, config, taller, cliente, precios } = useEstado();
  return {
    proveedor: async () => {
      const [{ pdfProveedor, compartirPdf }, { leerFotos }] = await Promise.all([import("@/lib/pdf"), import("@/lib/fotos")]);
      await compartirPdf(pdfProveedor(resultado, config, taller, cliente, leerFotos().logo), nombreArchivo("orden-de-corte", cliente.proyecto));
    },
    planos: async () => {
      const [{ pdfPlanos, compartirPdf }, { vistaExplotada, codigosMueble }, { leerFotos }] = await Promise.all([import("@/lib/pdf"), import("@/lib/explotada"), import("@/lib/fotos")]);
      const explotadas: Record<string, string> = {};
      for (const [i, m] of resultado.muebles.entries()) {
        const url = await vistaExplotada(m.resultado, Number(m.item.valores.fondo ?? 500), config, codigosMueble(m.resultado, i), m.item.acabados, m.item.muebleId).catch(() => null);
        if (url) explotadas[m.item.uid] = url;
      }
      await compartirPdf(pdfPlanos(resultado, taller, cliente, config, explotadas, leerFotos().logo), nombreArchivo("orden-de-produccion", cliente.proyecto));
    },
    /** Arma el PDF de la cotización sin compartirlo (para verlo o enviarlo). */
    docCotizacion: async (detallado: boolean, conTrabajos = true) => {
      const [{ pdfCotizacion }, { imagenesProyecto }, { leerFotos }] = await Promise.all([import("@/lib/pdf"), import("@/lib/renders"), import("@/lib/fotos")]);
      const imagenes = await imagenesProyecto(resultado.muebles, config).catch(() => ({}));
      const propias = leerFotos();
      const doc = pdfCotizacion(resultado, precios, taller, cliente, detallado, imagenes, { logo: propias.logo, trabajos: conTrabajos ? propias.trabajos : [] });
      return { doc, nombre: nombreArchivo("cotizacion", cliente.proyecto || cliente.cliente) };
    },
  };
}

export function PanelCortes() {
  const { resultado, config } = useEstado();
  const pdf = useAccionesPdf();
  if (!resultado.cortes.length) return <Vacio />;
  return (
    <div className="panel">
      <div className="panel-cab">
        <h2>Lista de cortes</h2>
        <BotonPdf principal etiqueta="PDF para el proveedor" generar={pdf.proveedor} />
      </div>
      <p className="nota">
        Medidas de corte en mm, ya descontando {config.espesorCanto} mm de canto por arista. Total de canto: <b>{mm(resultado.metrosCanto)} m</b>.
      </p>
      {resultado.materiales
        .filter((m) => resultado.cortes.some((f) => f.tablero === m.id))
        .map((m) => (
          <section key={m.id} className="bloque">
            <h3>{m.nombre}</h3>
            <div className="tabla-cortes">
              <div className="fila cab">
                <span>Cód.</span>
                <span>Pieza</span>
                <span className="num">Largo</span>
                <span className="num">Ancho</span>
                <span className="num">Cant.</span>
                <span>Canto</span>
              </div>
              {resultado.cortes
                .filter((f) => f.tablero === m.id)
                .map((f) => (
                  <div className="fila" key={f.codigo}>
                    <span>
                      <i className="punto" style={{ background: colorMueble(f.codigo) }} />
                      {f.codigo}
                    </span>
                    <span>
                      {f.pieza}
                      <small>{f.mueble}</small>
                    </span>
                    <span className="num fuerte">{mm(f.largoCorte)}</span>
                    <span className="num fuerte">{mm(f.anchoCorte)}</span>
                    <span className="num">{f.cantidad}</span>
                    <span className="cantos">{textoCantos(f.cantos)}</span>
                  </div>
                ))}
            </div>
          </section>
        ))}
      <section className="bloque">
        <h3>Herrajes</h3>
        <ul className="lista-herrajes">
          {resultado.herrajes.map((h) => (
            <li key={h.clave}>
              <b>
                {mm(h.cantidad)} {h.unidad}
              </b>{" "}
              {h.nombre}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function PanelLaminas() {
  const { resultado, config } = useEstado();
  const pdf = useAccionesPdf();
  if (!resultado.cortes.length) return <Vacio />;
  return (
    <div className="panel">
      <div className="panel-cab">
        <h2>Optimización de láminas</h2>
        <BotonPdf principal etiqueta="PDF para el proveedor" generar={pdf.proveedor} />
      </div>
      <p className="nota">
        Sierra {config.sierra} mm · refilado {config.refilado} mm. Los números son el código de cada pieza en la lista de cortes.
      </p>
      {resultado.advertencias
        .filter((a) => a.includes("no cabe"))
        .map((a, i) => (
          <p key={i} className="avisos">
            {a}
          </p>
        ))}
      {resultado.materiales
        .filter((m) => m.laminas.length)
        .map((m) => (
          <section key={m.id} className="bloque">
            <h3>
              {m.nombre}: {m.laminas.length} lámina{m.laminas.length > 1 ? "s" : ""}
            </h3>
            {m.veta && <p className="veta-nota">Con veta: las líneas muestran el sentido de la veta (a lo largo de la lámina). No girar las piezas.</p>}
            {m.laminas.map((l) => (
              <figure key={l.numero} className="lamina">
                <figcaption>
                  Lámina {l.numero} · {l.piezas.length} piezas · <b>{Math.round(l.aprovechamiento * 100)} %</b> aprovechado
                </figcaption>
                <LaminaSvg lamina={l} veta={m.veta} />
              </figure>
            ))}
          </section>
        ))}
    </div>
  );
}

export function PanelArmado() {
  const { resultado, config } = useEstado();
  const pdf = useAccionesPdf();
  const [sel, setSel] = useState(0);
  const [paso, setPaso] = useState(0);
  const [todas, setTodas] = useState(false);
  const [explotada, setExplotada] = useState<{ clave: string; url: string | null } | null>(null);
  const [verExplotada, setVerExplotada] = useState(false);
  const m = resultado.muebles[Math.min(sel, Math.max(0, resultado.muebles.length - 1))];
  const planos = useMemo(() => (m ? perforaciones(m.resultado, config, Number(m.item.valores.fondo ?? 500)) : []), [m, config]);
  const claveExp = m ? `${m.item.uid}:${JSON.stringify(m.item.valores)}:${JSON.stringify(m.item.acabados)}` : "";
  useEffect(() => {
    if (!verExplotada || !m || explotada?.clave === claveExp) return;
    let vivo = true;
    (async () => {
      const { vistaExplotada, codigosMueble } = await import("@/lib/explotada");
      const idx = resultado.muebles.indexOf(m);
      const url = await vistaExplotada(m.resultado, Number(m.item.valores.fondo ?? 500), config, codigosMueble(m.resultado, idx), m.item.acabados, m.item.muebleId);
      if (vivo) setExplotada({ clave: claveExp, url });
    })();
    return () => {
      vivo = false;
    };
  }, [verExplotada, claveExp, m, config, resultado.muebles, explotada?.clave]);
  if (!resultado.muebles.length || !m) return <Vacio />;
  const pasos = m.resultado.pasos;
  const p = Math.min(paso, pasos.length - 1);
  const conocidas = new Set(pasos.flatMap((x) => x.piezas));
  const visibles = new Set(pasos.slice(0, p + 1).flatMap((x) => x.piezas));
  const resaltar = new Set(pasos[p]?.piezas ?? []);
  const conFrentes = pasos.slice(0, p + 1).some((x) => x.piezas.some((id) => esPuerta(id) || id.endsWith("_frente")));
  return (
    <div className="panel">
      <div className="panel-cab">
        <h2>Planos y armado</h2>
        <BotonPdf principal etiqueta="Orden de producción (PDF)" generar={pdf.planos} />
      </div>
      <div className="chips">
        {resultado.muebles.map((x, i) => (
          <button
            key={x.item.uid}
            className={`chip${i === sel ? " activo" : ""}`}
            onClick={() => {
              setSel(i);
              setPaso(0);
            }}
          >
            {x.item.nombre}
          </button>
        ))}
      </div>
      <div className="segmentos vista-armado" role="group" aria-label="Tipo de vista">
        <button className={!verExplotada ? "activo" : ""} aria-pressed={!verExplotada} onClick={() => setVerExplotada(false)}>
          Paso a paso
        </button>
        <button className={verExplotada ? "activo" : ""} aria-pressed={verExplotada} onClick={() => setVerExplotada(true)}>
          Vista explotada 3D
        </button>
      </div>
      {verExplotada && (
        <figure className="explotada">
          {explotada?.clave === claveExp ? (
            explotada.url ? (
              <div className="explotada-scroll">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={explotada.url} alt={`Vista explotada de ${m.item.nombre} con el código de cada pieza y sus herrajes`} />
              </div>
            ) : (
              <p className="hist-nota">Este equipo no puede dibujar en 3D.</p>
            )
          ) : (
            <div className="cargando-3d" aria-label="Dibujando la vista explotada" />
          )}
          <figcaption>Cada línea punteada lleva al código de la pieza en la lista de cortes (café) o al herraje (azul). Desliza la imagen hacia los lados para verla completa.</figcaption>
        </figure>
      )}
      <div className="editor">
        <div className="editor-vista">
          <VistaMueble vista={m.resultado.vista} visibles={visibles} conocidas={conocidas} resaltar={resaltar} frentes={conFrentes} />
        </div>
        <div className="editor-form">
          <ol className="pasos">
            {pasos.map((x, i) => (
              <li key={i} className={i === p ? "activo" : i < p ? "hecho" : ""} onClick={() => setPaso(i)}>
                <b>{x.titulo}</b>
                {i === p && <p>{x.descripcion}</p>}
              </li>
            ))}
          </ol>
          <div className="acciones">
            <button className="btn-sec" disabled={p === 0} onClick={() => setPaso(p - 1)}>
              ← Anterior
            </button>
            <button className="btn" disabled={p >= pasos.length - 1} onClick={() => setPaso(p + 1)}>
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      {planos.length > 0 && (
        <section className="perf-lista">
          <div className="panel-cab">
            <h3>{todas ? "Todas las perforaciones" : "Perforaciones de este paso"}</h3>
            <button className="btn-texto" onClick={() => setTodas((t) => !t)}>
              {todas ? "Solo este paso" : `Ver todas (${planos.length} piezas)`}
            </button>
          </div>
          {(() => {
            const delPaso = planos.filter((x) => resaltar.has(x.piezaId));
            const lista = todas ? planos : delPaso;
            if (!lista.length)
              return <p className="hist-nota">Este paso no lleva perforaciones nuevas. Toca “Ver todas” para ver el taladrado de cada pieza.</p>;
            return lista.map((x) => (
              <div key={x.clave}>
                <h4>
                  {x.titulo}
                  {x.veces * m.item.cantidad > 1 ? ` · ${x.veces * m.item.cantidad} iguales` : ""}
                </h4>
                <PlanoPerforacion plano={x} />
              </div>
            ));
          })()}
        </section>
      )}
    </div>
  );
}

/** Imágenes 3D de los muebles del proyecto (se dibujan una por una, sin frenar la pantalla). */
function useImagenes3D() {
  const { resultado, config } = useEstado();
  const [imagenes, setImagenes] = useState<Record<string, string>>({});
  const [sin3d, setSin3d] = useState(false);
  useEffect(() => {
    let vivo = true;
    (async () => {
      const { imagenMueble } = await import("@/lib/renders");
      for (const m of resultado.muebles) {
        const url = await imagenMueble(m, config).catch(() => null);
        if (!vivo) return;
        if (url) setImagenes((s) => (s[m.item.uid] === url ? s : { ...s, [m.item.uid]: url }));
        else setSin3d(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [resultado.muebles, config]);
  return { imagenes, sin3d };
}

function PrecioProveedor({ nombre, cantidad, valor, simbolo, onCambio }: { nombre: string; cantidad: string; valor: number; simbolo: string; onCambio: (n: number) => void }) {
  return (
    <label className="fila-proveedor">
      <span>
        {nombre}
        <small>{cantidad}</small>
      </span>
      <div className="input-mm">
        <InputNumero valor={valor} onCambio={onCambio} vacioSiCero placeholder="0" />
        <em>{simbolo}</em>
      </div>
    </label>
  );
}

/** Pedirle cotización al proveedor con las cantidades exactas y anotar los precios que responda. */
function BloqueProveedor() {
  const { resultado, config, setConfig, precios, setPrecios, taller, setTaller, cliente } = useEstado();
  const [conHerrajes, setConHerrajes] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const $ = (n: number) => formatoDinero(n, precios);
  const usados = resultado.materiales.filter((m) => m.laminas.length > 0);
  const totalLaminas = usados.reduce((s, m) => s + m.laminas.length, 0);
  const piezas = resultado.cortes.reduce((s, f) => s + f.cantidad, 0);
  const plural = (n: number, uno: string, varios: string) => `${mm(n)} ${n === 1 ? uno : varios}`;

  const lineas = [
    "Hola, buen día. ¿Me ayuda con la cotización de este pedido, por favor?",
    "",
    "*Tableros*",
    ...usados.map((m) => {
      const espesor = m.nombre.includes(`${mm(m.espesor)} mm`) ? "" : `, ${mm(m.espesor)} mm`;
      return `• ${plural(m.laminas.length, "lámina", "láminas")} de ${m.nombre}${espesor} (${mm(m.largoLamina)} × ${mm(m.anchoLamina)} mm)`;
    }),
    "",
    "*Corte y canto*",
    `• Corte de ${plural(totalLaminas, "lámina", "láminas")} (${plural(piezas, "pieza", "piezas")})`,
    ...(resultado.metrosCanto > 0 ? [`• ${mm(resultado.metrosCanto)} m de canto de ${mm(config.espesorCanto)} mm, pegado`] : []),
    ...(conHerrajes && resultado.herrajes.length ? ["", "*Herrajes*", ...resultado.herrajes.map((h) => `• ${mm(h.cantidad)} × ${h.nombre}`)] : []),
    "",
    "¿Me confirma precio de cada cosa y tiempo de entrega? Le envío el plano de cortes en PDF.",
    `Gracias${taller.nombre ? `. ${taller.nombre}` : ""}${cliente.proyecto ? ` (${cliente.proyecto})` : ""}`,
  ];
  const mensaje = lineas.join("\n");
  const tel = (taller.proveedor ?? "").replace(/\D/g, "");
  const claveHerraje = (clave: string) => (clave in precios.herrajes ? clave : clave.startsWith("corredera_") ? "corredera" : clave);

  return (
    <details className="bloque plegable proveedor" open>
      <summary>Proveedor: pide precios y anótalos</summary>

      <h4>
        <b>1</b> Pídele la cotización
      </h4>
      <pre className="mensaje-proveedor">{mensaje}</pre>
      <label className="campo campo-switch">
        <span>Incluir herrajes en el pedido</span>
        <input type="checkbox" checked={conHerrajes} onChange={(e) => setConHerrajes(e.target.checked)} />
        <i aria-hidden />
      </label>
      <label className="campo">
        <span>WhatsApp del proveedor</span>
        <input type="tel" inputMode="tel" value={taller.proveedor ?? ""} placeholder="573001234567" onChange={(e) => setTaller({ ...taller, proveedor: e.target.value })} />
      </label>
      <div className="acciones">
        <a className="btn-wa" href={`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer">
          Enviar al proveedor por WhatsApp
        </a>
        <button
          className="btn-sec"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(mensaje);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1800);
            } catch {
              /* sin permiso para copiar */
            }
          }}
        >
          {copiado ? "Copiado" : "Copiar mensaje"}
        </button>
      </div>

      <h4>
        <b>2</b> Anota lo que te cotizó
      </h4>
      <p className="nota">Escribe el precio por unidad. La cotización se actualiza sola y los precios quedan guardados para la próxima.</p>
      <div className="lista-proveedor">
        {usados.map((m) => {
          return (
            <PrecioProveedor
              key={m.id}
              nombre={`${m.nombre} (por lámina)`}
              cantidad={`Necesitas ${plural(m.laminas.length, "lámina", "láminas")}`}
              valor={m.precioLamina}
              simbolo={precios.simbolo}
              onCambio={(n) => setConfig({ ...config, preciosTablero: { ...config.preciosTablero, [m.id]: n } })}
            />
          );
        })}
        {totalLaminas > 0 && (
          <PrecioProveedor nombre="Corte (por lámina)" cantidad={`Son ${plural(totalLaminas, "lámina", "láminas")}`} valor={precios.servicioCortePorLamina} simbolo={precios.simbolo} onCambio={(n) => setPrecios({ ...precios, servicioCortePorLamina: n })} />
        )}
        {resultado.metrosCanto > 0 && (
          <>
            <PrecioProveedor nombre="Canto (por metro)" cantidad={`Necesitas ${mm(resultado.metrosCanto)} m`} valor={precios.cantoPorMetro} simbolo={precios.simbolo} onCambio={(n) => setPrecios({ ...precios, cantoPorMetro: n })} />
            <PrecioProveedor nombre="Pegado de canto (por metro)" cantidad={`Son ${mm(resultado.metrosCanto)} m`} valor={precios.canteadoPorMetro} simbolo={precios.simbolo} onCambio={(n) => setPrecios({ ...precios, canteadoPorMetro: n })} />
          </>
        )}
        {conHerrajes &&
          resultado.herrajes.map((h) => (
            <PrecioProveedor
              key={h.clave}
              nombre={h.nombre}
              cantidad={`Necesitas ${mm(h.cantidad)}`}
              valor={precioHerraje(precios, h.clave)}
              simbolo={precios.simbolo}
              onCambio={(n) => setPrecios({ ...precios, herrajes: { ...precios.herrajes, [claveHerraje(h.clave)]: n } })}
            />
          ))}
      </div>
      <div className="total-proveedor">
        <span>Materiales y herrajes</span>
        <b>{$(resultado.subtotalMateriales)}</b>
      </div>
    </details>
  );
}


type Envio = "listo" | "armando" | "enviado" | "error";

/** Vista previa en HTML de la primera página del PDF: lo que el cliente va a abrir. */
function HojaCotizacion({ imagenes, sin3d, logo, numero }: { imagenes: Record<string, string>; sin3d: boolean; logo: string | null; numero: string }) {
  const { resultado, precios, cliente, taller } = useEstado();
  const $ = (n: number) => formatoDinero(n, precios);
  return (
    <div className="hoja" aria-label="Vista previa del PDF">
      <div className="hoja-cab">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="hoja-logo" />
        )}
        <div>
          <b>Cotización</b>
          <span>{taller.nombre || <em className="hoja-falta">Nombre de tu taller</em>}</span>
          {taller.telefono && <span>WhatsApp {taller.telefono}</span>}
        </div>
        <div className="hoja-der">
          <span>N.º {numero}</span>
          {cliente.proyecto && <span>{cliente.proyecto}</span>}
          {cliente.cliente && <span>Para: {cliente.cliente}</span>}
        </div>
      </div>
      {resultado.muebles.map((m) => (
        <div className="hoja-item" key={m.item.uid}>
          {imagenes[m.item.uid] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagenes[m.item.uid]} alt={`${m.item.nombre} en 3D`} />
          ) : sin3d ? (
            <VistaMueble vista={m.resultado.vista} />
          ) : (
            <div className="cargando-3d" aria-label="Dibujando el mueble en 3D" />
          )}
          <div>
            <b>
              {m.item.cantidad} × {m.item.nombre}
            </b>
            <small>
              {mm(m.resultado.vista.ancho)} × {mm(m.resultado.vista.alto)} × {mm(Number(m.item.valores.fondo ?? 0))} mm
            </small>
          </div>
        </div>
      ))}
      {resultado.transporte > 0 && (
        <div className="hoja-linea">
          <span>Transporte / envío</span>
          <span>{$(resultado.transporte)}</span>
        </div>
      )}
      <div className="hoja-total">
        <span>TOTAL</span>
        <b>{$(resultado.total)}</b>
      </div>
      <ul className="hoja-cond">
        {condiciones(resultado, precios, cliente).map((c) => (
          <li key={c}>{c}</li>
        ))}
        {cliente.notas
          .split("\n")
          .filter(Boolean)
          .map((n) => (
            <li key={n}>{n}</li>
          ))}
      </ul>
      <div className="hoja-cta">
        <b>¿Empezamos?</b> Responde “APROBADO” {taller.telefono ? `al WhatsApp ${taller.telefono}` : "a este mensaje"} y agendamos la fabricación.
      </div>
    </div>
  );
}

/** Sube el PDF a la nube y devuelve un link corto que cualquiera con el link puede abrir. */
async function subirPdf(blob: Blob) {
  const id = crypto.randomUUID();
  const { error } = await supabase().storage.from("inner-muebles-cotizaciones").upload(`c/${id}.pdf`, blob, { contentType: "application/pdf", upsert: false });
  if (error) throw error;
  return { id, link: `${location.origin}/c/${id}` };
}

export function PanelCotizar() {
  const { resultado, precios, cliente, setCliente, taller, items } = useEstado();
  const { registrar } = useCotizaciones();
  const pdf = useAccionesPdf();
  const [detallado, setDetallado] = useState(false);
  const [conTrabajos, setConTrabajos] = useState(true);
  const [editando, setEditando] = useState(false);
  const [envio, setEnvio] = useState<Envio>("listo");
  const [numero] = useState(() => numeroCotizacion());
  const { fotos } = useFotos();
  const { imagenes, sin3d } = useImagenes3D();
  if (!resultado.muebles.length) return <Vacio />;
  const $ = (n: number) => formatoDinero(n, precios);
  const mensaje = mensajeCliente(resultado, precios, cliente, taller);
  const tel = cliente.telefono.replace(/\D/g, "");
  const { pct, anticipo, saldo } = pagos(resultado.total, cliente);
  const piezas = resultado.muebles.reduce((s, m) => s + m.item.cantidad, 0);
  const faltaTaller = !taller.nombre || !taller.telefono;

  async function verPdf() {
    // la pestaña se abre antes del trabajo para que el navegador no la bloquee
    const ventana = window.open("", "_blank");
    setEnvio("armando");
    try {
      const { doc, nombre } = await pdf.docCotizacion(detallado, conTrabajos);
      const url = URL.createObjectURL(doc.output("blob"));
      if (ventana) ventana.location.href = url;
      else doc.save(nombre);
      setEnvio("listo");
    } catch {
      ventana?.close();
      setEnvio("error");
    }
  }

  /** Comparte el archivo con el menú del celular (solo muestra chats ya guardados). */
  async function compartir() {
    setEnvio("armando");
    try {
      const { doc, nombre } = await pdf.docCotizacion(detallado, conTrabajos);
      const archivo = new File([doc.output("blob")], nombre, { type: "application/pdf" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && nav.canShare?.({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], text: mensaje, title: nombre });
          setEnvio("enviado");
        } catch (e) {
          setEnvio((e as Error).name === "AbortError" ? "listo" : "error");
        }
        return;
      }
      doc.save(nombre);
      setEnvio("listo");
    } catch {
      setEnvio("error");
    }
  }

  /** Abre el chat con el número del cliente (aunque no esté guardado) con el mensaje y el link al PDF. */
  async function enviar() {
    if (!cuentasActivas) return compartir();
    // la pestaña se abre antes de subir el PDF para que el celular no la bloquee
    const ventana = window.open("", "_blank");
    setEnvio("armando");
    try {
      const { doc } = await pdf.docCotizacion(detallado, conTrabajos);
      const { id, link } = await subirPdf(doc.output("blob"));
      // queda en "Mis cotizaciones"; si falla, igual se envía
      await registrar({
        id,
        numero,
        cliente: cliente.cliente,
        telefono: tel,
        proyecto: cliente.proyecto,
        total: resultado.total,
        anticipo: pct > 0 && pct < 100 ? anticipo : 0,
        moneda: { simbolo: precios.simbolo, decimales: precios.decimales },
        datos: { items, cliente },
      }).catch(() => {});
      const texto = `${mensaje}\n\n📄 Cotización en PDF: ${link}`;
      const destino = `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
      if (ventana) ventana.location.href = destino;
      else location.href = destino;
      setEnvio("enviado");
    } catch {
      ventana?.close();
      setEnvio("error");
    }
  }

  return (
    <div className="panel panel-cotizar">
      <div className="cot-resumen">
        <div>
          <span>Precio al cliente</span>
          <strong>{$(resultado.total)}</strong>
          <small>
            {piezas} mueble{piezas === 1 ? "" : "s"} · válido hasta el {validaHasta(cliente)}
          </small>
        </div>
        {pct > 0 && pct < 100 && (
          <div className="cot-pagos">
            <span>
              Anticipo {pct} % <b>{$(anticipo)}</b>
            </span>
            <span>
              Contra entrega <b>{$(saldo)}</b>
            </span>
          </div>
        )}
      </div>

      <section className="bloque cot-paso">
        <h3>
          <i>1</i> ¿Para quién es?
        </h3>
        <div className="grid-campos">
          <label className="campo">
            <span>Nombre del cliente</span>
            <input value={cliente.cliente} placeholder="Laura Martínez" autoComplete="off" onChange={(e) => setCliente({ ...cliente, cliente: e.target.value })} />
          </label>
          <label className="campo">
            <span>WhatsApp del cliente</span>
            <input type="tel" inputMode="tel" value={cliente.telefono} placeholder="57 300 123 4567" onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })} />
          </label>
        </div>
        <label className="campo">
          <span>Proyecto</span>
          <input value={cliente.proyecto} placeholder="Clóset alcoba principal" onChange={(e) => setCliente({ ...cliente, proyecto: e.target.value })} />
        </label>
      </section>

      <section className="bloque cot-paso">
        <h3>
          <i>2</i> Condiciones
        </h3>
        <div className="campo">
          <span>Anticipo para empezar</span>
          <div className="segmentos cot-chips" role="group" aria-label="Anticipo">
            {[0, 30, 50, 70, 100].map((n) => (
              <button key={n} className={cliente.anticipoPorcentaje === n ? "activo" : ""} aria-pressed={cliente.anticipoPorcentaje === n} onClick={() => setCliente({ ...cliente, anticipoPorcentaje: n })}>
                {n === 0 ? "Sin anticipo" : `${n} %`}
              </button>
            ))}
          </div>
        </div>
        <div className="grid-campos">
          <label className="campo">
            <span>Entrega (días hábiles)</span>
            <input type="number" inputMode="numeric" min={0} value={cliente.entregaDias || ""} placeholder="Ej. 15" onChange={(e) => setCliente({ ...cliente, entregaDias: Number(e.target.value) || 0 })} />
          </label>
          <label className="campo">
            <span>Precio válido (días)</span>
            <input type="number" inputMode="numeric" min={1} value={cliente.validezDias} onChange={(e) => setCliente({ ...cliente, validezDias: Number(e.target.value) || 0 })} />
          </label>
        </div>
        <label className="campo">
          <span>Transporte o envío</span>
          <InputNumero valor={cliente.transporte} onCambio={(n) => setCliente({ ...cliente, transporte: n })} vacioSiCero placeholder="0 = no se cobra aparte" />
          <small>Se suma al total tal cual, sin utilidad, y sale como línea aparte en el PDF.</small>
        </label>
        <label className="campo">
          <span>Notas para el cliente</span>
          <textarea rows={2} value={cliente.notas} placeholder="Incluye instalación y transporte." onChange={(e) => setCliente({ ...cliente, notas: e.target.value })} />
        </label>
        <div className="cot-opciones">
          <label className="campo campo-switch">
            <span>Mostrar desglose de costos al cliente</span>
            <input type="checkbox" checked={detallado} onChange={(e) => setDetallado(e.target.checked)} />
            <i aria-hidden />
          </label>
          {fotos.trabajos.length > 0 && (
            <label className="campo campo-switch">
              <span>Incluir fotos de mis trabajos ({fotos.trabajos.length})</span>
              <input type="checkbox" checked={conTrabajos} onChange={(e) => setConTrabajos(e.target.checked)} />
              <i aria-hidden />
            </label>
          )}
        </div>
      </section>

      <section className="bloque cot-paso">
        <h3>
          <i>3</i> Así le llega a tu cliente
        </h3>
        {faltaTaller && (
          <p className="cot-aviso">
            Tu cotización sale sin {!taller.nombre ? "nombre del taller" : "tu WhatsApp"}. Complétalo en <a href="#precios">Mis precios</a> para que el cliente sepa a quién responder.
            {!fotos.logo && " Ahí también puedes subir tu logo."}
          </p>
        )}
        <HojaCotizacion imagenes={imagenes} sin3d={sin3d} logo={fotos.logo} numero={numero} />
        <button className="btn-sec cot-ver" onClick={verPdf} disabled={envio === "armando"}>
          Ver el PDF completo
        </button>
      </section>

      <section className="bloque cot-paso">
        <h3>
          <i>4</i> Mensaje de WhatsApp
        </h3>
        {editando ? (
          <label className="campo">
            <span className="solo-lector">Mensaje para el cliente</span>
            <textarea rows={9} value={mensaje} onChange={(e) => setCliente({ ...cliente, mensaje: e.target.value })} />
          </label>
        ) : (
          <div className="cot-burbuja">
            {mensaje.split("\n").map((l, i) => (
              <p key={i}>{l.split(/(\*[^*]+\*)/g).map((t, j) => (t.startsWith("*") && t.endsWith("*") && t.length > 2 ? <b key={j}>{t.slice(1, -1)}</b> : t))}</p>
            ))}
            <span className="cot-adjunto">{cuentasActivas ? "📄 Cotización en PDF: link para abrirla" : "PDF · Cotización con el diseño en 3D"}</span>
          </div>
        )}
        <div className="cot-msg-acciones">
          <button className="btn-texto" onClick={() => setEditando(!editando)}>
            {editando ? "Listo" : "Editar mensaje"}
          </button>
          {cliente.mensaje && (
            <button className="btn-texto" onClick={() => setCliente({ ...cliente, mensaje: "" })}>
              Volver al mensaje automático
            </button>
          )}
        </div>
      </section>

      <div className="cot-enviar">
        <button className="btn btn-enviar" onClick={enviar} disabled={envio === "armando"} aria-busy={envio === "armando"}>
          {envio === "armando" && <i className="girando" aria-hidden />}
          {envio === "armando" ? "Preparando el PDF…" : `Enviar por WhatsApp${cliente.cliente ? ` a ${cliente.cliente.split(" ")[0]}` : ""}`}
        </button>
        {cuentasActivas && (
          <p className="nota">
            {tel ? "Funciona aunque no tengas el número guardado." : "Escribe el WhatsApp del cliente arriba, o elige el chat al abrir WhatsApp."} El mensaje lleva un link para abrir el PDF.
          </p>
        )}
        {envio === "enviado" && <p className="cot-ok">Listo, revisa WhatsApp y toca enviar.</p>}
        {envio === "error" && <p className="cot-error">No se pudo preparar el envío. Revisa tu internet e inténtalo de nuevo.</p>}
        {cuentasActivas && (
          <button className="btn-sec" onClick={compartir} disabled={envio === "armando"}>
            Compartir el archivo PDF (contactos guardados)
          </button>
        )}
      </div>

      <details className="bloque cot-costos">
        <summary>Tus costos (solo los ves tú)</summary>
        <div className="tabla-costos">
          {resultado.costos.map((c, i) => (
            <div key={i} className="fila">
              <span>
                {c.concepto}
                <small>
                  {mm(c.cantidad)} × {$(c.unitario)}
                </small>
              </span>
              <span className="num">{$(c.total)}</span>
            </div>
          ))}
          <div className="fila sub">
            <span>Materiales y herrajes</span>
            <span className="num">{$(resultado.subtotalMateriales)}</span>
          </div>
          <div className="fila">
            <span>Mano de obra ({precios.manoObraPorcentaje} %)</span>
            <span className="num">{$(resultado.manoObra)}</span>
          </div>
          {resultado.otrosCostos > 0 && (
            <div className="fila">
              <span>Otros costos</span>
              <span className="num">{$(resultado.otrosCostos)}</span>
            </div>
          )}
          <div className="fila">
            <span>Utilidad ({precios.margenPorcentaje} %)</span>
            <span className="num">{$(resultado.utilidad)}</span>
          </div>
          {resultado.transporte > 0 && (
            <div className="fila">
              <span>Transporte / envío (sin utilidad)</span>
              <span className="num">{$(resultado.transporte)}</span>
            </div>
          )}
          {resultado.impuesto > 0 && (
            <div className="fila">
              <span>Impuesto ({precios.impuestoPorcentaje} %)</span>
              <span className="num">{$(resultado.impuesto)}</span>
            </div>
          )}
          <div className="fila total">
            <span>Precio al cliente</span>
            <span className="num">{$(resultado.total)}</span>
          </div>
        </div>
      </details>

      <BloqueProveedor />

      <div className="acciones apiladas">
        <BotonPdf etiqueta="PDF de cortes para el proveedor" generar={pdf.proveedor} />
        <BotonPdf etiqueta="Orden de producción (PDF)" generar={pdf.planos} />
      </div>
    </div>
  );
}
