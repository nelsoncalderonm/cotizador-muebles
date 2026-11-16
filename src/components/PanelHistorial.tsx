"use client";
// "Mis cotizaciones": lo enviado por link, quién la abrió, seguimiento y cierre.

import { useEffect, useState } from "react";
import { formatoDinero, useEstado } from "@/lib/estado";
import { hace, useCotizaciones, type Cotizacion, type EstadoCot } from "@/lib/cotizaciones";

type Filtro = "todas" | EstadoCot;
const FILTROS: { id: Filtro; etiqueta: string }[] = [
  { id: "todas", etiqueta: "Todas" },
  { id: "enviada", etiqueta: "Esperando" },
  { id: "aprobada", etiqueta: "Aprobadas" },
  { id: "perdida", etiqueta: "Perdidas" },
];

const dinero = (c: Pick<Cotizacion, "moneda">, n: number) => formatoDinero(n, c.moneda ?? { simbolo: "$", decimales: 0 });

export function mensajeSeguimiento(c: Cotizacion, taller: string) {
  const nombre = (c.cliente || "").trim().split(/\s+/)[0];
  const de = c.proyecto ? ` de *${c.proyecto}*` : "";
  const link = `${location.origin}/c/${c.id}`;
  const firma = taller ? `\n\n${taller}` : "";
  if (c.vistas > 0)
    return `Hola${nombre ? ` ${nombre}` : ""}, vi que revisaste la cotización${de}. ¿Te quedó alguna duda o quieres que ajustemos algo (medidas, color, presupuesto)? Si te sirve así, respóndeme *APROBADO* y agendamos.${firma}`;
  return `Hola${nombre ? ` ${nombre}` : ""}, te escribo para saber si pudiste ver la cotización${de} que te envié. Te la dejo de nuevo aquí: ${link}${firma}`;
}

export function PanelHistorial({ irAlCotizador }: { irAlCotizador: () => void }) {
  const { activas, lista, cargando, nuevasVistas, cambiarEstado, borrar, marcarVistas, recargar } = useCotizaciones();
  const { items, reemplazar, taller } = useEstado();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  // lo que estaba "nuevo" al entrar se resalta mientras el carpintero está aquí
  const [resaltar] = useState(() => new Set(nuevasVistas.map((c) => c.id)));

  useEffect(() => {
    void recargar();
  }, [recargar]);
  useEffect(() => {
    if (nuevasVistas.length) marcarVistas();
  }, [nuevasVistas.length, marcarVistas]);

  if (!activas)
    return (
      <div className="panel">
        <div className="vacio">
          <p>Entra con tu cuenta para guardar las cotizaciones que envías y saber cuándo tu cliente las abre.</p>
        </div>
      </div>
    );

  const esperando = lista.filter((c) => c.estado === "enviada");
  const aprobadas = lista.filter((c) => c.estado === "aprobada");
  const cerradas = aprobadas.length + lista.filter((c) => c.estado === "perdida").length;
  const ref = lista[0] ?? { moneda: null };
  const suma = (l: Cotizacion[]) => l.reduce((s, c) => s + c.total, 0);
  const visibles = filtro === "todas" ? lista : lista.filter((c) => c.estado === filtro);

  function cargar(c: Cotizacion) {
    if (!c.datos?.items?.length) return;
    if (items.length && !confirm("¿Cargar esta cotización en el cotizador? Se reemplazan los muebles que tienes ahora.")) return;
    reemplazar({ items: c.datos.items, cliente: { ...c.datos.cliente, mensaje: "" } });
    irAlCotizador();
  }

  return (
    <div className="panel-historial">

      <div className="hist-resumen">
        <div>
          <span>Esperando respuesta</span>
          <strong>{dinero(ref, suma(esperando))}</strong>
          <small>
            {esperando.length} cotizacion{esperando.length === 1 ? "" : "es"}
          </small>
        </div>
        <div>
          <span>Aprobadas</span>
          <strong>{dinero(ref, suma(aprobadas))}</strong>
          <small>
            {aprobadas.length} trabajo{aprobadas.length === 1 ? "" : "s"}
            {cerradas > 0 ? ` · cierras el ${Math.round((aprobadas.length / cerradas) * 100)} %` : ""}
          </small>
        </div>
      </div>

      <div className="cot-chips hist-filtros" role="tablist">
        {FILTROS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filtro === f.id} className={`chip${filtro === f.id ? " activo" : ""}`} onClick={() => setFiltro(f.id)}>
            {f.etiqueta}
          </button>
        ))}
      </div>

      {cargando && !lista.length ? (
        <p className="hist-nota">Cargando…</p>
      ) : !lista.length ? (
        <div className="vacio">
          <p>
            Aquí van a aparecer las cotizaciones que envíes por WhatsApp desde <b>Cotizar</b>. Vas a ver cuándo tu cliente la abre, cuánto tienes por
            cerrar y a quién hacerle seguimiento.
          </p>
          <button className="btn" onClick={irAlCotizador}>
            Ir a cotizar
          </button>
        </div>
      ) : !visibles.length ? (
        <p className="hist-nota">No hay cotizaciones en este grupo.</p>
      ) : (
        <ul className="hist-lista">
          {visibles.map((c) => (
            <li key={c.id} className={`hist-item hist-${c.estado}${resaltar.has(c.id) ? " hist-nueva" : ""}`}>
              <div className="hist-cabeza">
                <div>
                  <b>{c.cliente || "Cliente sin nombre"}</b>
                  <small>
                    {[c.proyecto, c.numero].filter(Boolean).join(" · ")}
                  </small>
                </div>
                <strong>{dinero(c, c.total)}</strong>
              </div>

              <p className="hist-vistas">
                {c.vistas > 0 ? (
                  <>
                    <span className="hist-ojo" aria-hidden>
                      👀
                    </span>
                    La abrió {c.vistas === 1 ? "1 vez" : `${c.vistas} veces`} · última {hace(c.vista_ultima)}
                  </>
                ) : (
                  <>Todavía no la abre</>
                )}
                <span className="hist-enviada">Enviada {hace(c.creada)}</span>
              </p>

              <div className="hist-estado" role="group" aria-label="Estado">
                {(["enviada", "aprobada", "perdida"] as EstadoCot[]).map((e) => (
                  <button key={e} className={`chip${c.estado === e ? " activo" : ""}`} aria-pressed={c.estado === e} onClick={() => void cambiarEstado(c.id, e)}>
                    {e === "enviada" ? "Esperando" : e === "aprobada" ? "✓ Aprobada" : "Perdida"}
                  </button>
                ))}
              </div>

              <div className="hist-acciones">
                {c.estado === "enviada" && c.telefono && (
                  <a className="btn btn-enviar hist-seguir" href={`https://wa.me/${c.telefono}?text=${encodeURIComponent(mensajeSeguimiento(c, taller.nombre))}`} target="_blank" rel="noreferrer">
                    Hacer seguimiento por WhatsApp
                  </a>
                )}
                <a className="btn-sec" href={`/c/${c.id}?yo=1`} target="_blank" rel="noreferrer">
                  Ver PDF
                </a>
                {c.datos?.items?.length ? (
                  <button className="btn-sec" onClick={() => cargar(c)}>
                    Abrir en el cotizador
                  </button>
                ) : null}
                <button
                  className="hist-borrar"
                  onClick={() => {
                    if (confirm("¿Quitar esta cotización de tu lista? El link que le enviaste al cliente sigue funcionando.")) void borrar(c.id);
                  }}
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="hist-nota">Las vistas se cuentan cuando tu cliente abre el link del PDF. Si lo abres tú desde aquí, no cuenta.</p>
    </div>
  );
}

/** Aviso flotante cuando un cliente abre una cotización. */
export function AvisoVistas({ alVer }: { alVer: () => void }) {
  const { nuevasVistas, marcarVistas } = useCotizaciones();
  if (!nuevasVistas.length) return null;
  const c = [...nuevasVistas].sort((a, b) => (b.vista_ultima || "").localeCompare(a.vista_ultima || ""))[0];
  const otras = nuevasVistas.length - 1;
  return (
    <div className="aviso-vista" role="status">
      <span aria-hidden>👀</span>
      <p>
        <b>{c.cliente || "Tu cliente"}</b> abrió tu cotización{c.proyecto ? ` de ${c.proyecto}` : ""} {hace(c.vista_ultima)}
        {otras > 0 ? ` (y ${otras} más)` : ""}. Buen momento para escribirle.
      </p>
      <button className="aviso-ver" onClick={alVer}>
        Ver
      </button>
      <button className="aviso-cerrar" aria-label="Cerrar aviso" onClick={marcarVistas}>
        ×
      </button>
    </div>
  );
}
