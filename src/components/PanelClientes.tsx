"use client";
// Clientes: a quién le toca escribir hoy, notas, recordatorios y sus cotizaciones.

import { useMemo, useState } from "react";
import { formatoDinero, useEstado, type DatosCliente } from "@/lib/estado";
import { claveCliente, hace, hoyISO, useCotizaciones, type Cliente, type Cotizacion } from "@/lib/cotizaciones";
import { mensajeSeguimiento } from "./PanelHistorial";

interface Ficha extends Cliente {
  cotizaciones: Cotizacion[];
  cotizado: number;
  aprobado: number;
  pendiente: Cotizacion | null;
}

const RECORDAR = [
  { dias: 1, etiqueta: "Mañana" },
  { dias: 3, etiqueta: "En 3 días" },
  { dias: 7, etiqueta: "En 1 semana" },
  { dias: 30, etiqueta: "En 1 mes" },
];

const dinero = (c: Cotizacion | undefined, n: number) => formatoDinero(n, c?.moneda ?? { simbolo: "$", decimales: 0 });

function fechaCorta(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
}

function cuando(proximo: string | null) {
  if (!proximo) return null;
  const hoy = hoyISO();
  if (proximo < hoy) return { texto: "Atrasado: escríbele hoy", clase: "tarde" };
  if (proximo === hoy) return { texto: "Escríbele hoy", clase: "hoy" };
  if (proximo === hoyISO(1)) return { texto: "Mañana", clase: "pronto" };
  return { texto: fechaCorta(proximo), clase: "pronto" };
}

function mensajeCliente(f: Ficha, taller: string) {
  if (f.pendiente) return mensajeSeguimiento(f.pendiente, taller);
  const nombre = (f.nombre || "").trim().split(/\s+/)[0];
  return `Hola${nombre ? ` ${nombre}` : ""}, ¿cómo estás? Te escribo de ${taller || "la carpintería"} para saber cómo te ha ido con el mueble y si necesitas algo más.`;
}

export function PanelClientes({ irAlCotizador }: { irAlCotizador: () => void }) {
  const { activas, clientes, lista, guardarCliente, borrarCliente, cargando } = useCotizaciones();
  const { items, reemplazar, taller } = useEstado();
  const [busca, setBusca] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);

  const fichas = useMemo(() => {
    const mapa = new Map<string, Ficha>();
    const vacia = (clave: string, c?: Partial<Cliente>): Ficha => ({
      clave,
      nombre: null,
      telefono: null,
      nota: null,
      proximo: null,
      ultimo_contacto: null,
      creado: new Date(0).toISOString(),
      ...c,
      cotizaciones: [],
      cotizado: 0,
      aprobado: 0,
      pendiente: null,
    });
    for (const c of clientes) mapa.set(c.clave, vacia(c.clave, c));
    for (const q of lista) {
      const k = claveCliente(q.telefono, q.cliente);
      if (!k) continue;
      const f = mapa.get(k) ?? vacia(k, { nombre: q.cliente, telefono: q.telefono, creado: q.creada });
      if (!f.nombre && q.cliente) f.nombre = q.cliente;
      f.cotizaciones.push(q);
      if (q.estado !== "perdida") f.cotizado += q.total;
      if (q.estado === "aprobada") f.aprobado += q.total;
      if (q.estado === "enviada" && !f.pendiente) f.pendiente = q;
      mapa.set(k, f);
    }
    return [...mapa.values()];
  }, [clientes, lista]);

  if (!activas)
    return (
      <div className="vacio">
        <p>Entra con tu cuenta para llevar tus clientes y recordatorios.</p>
      </div>
    );

  const t = busca.trim().toLowerCase();
  const filtradas = t ? fichas.filter((f) => `${f.nombre ?? ""} ${f.telefono ?? ""} ${f.nota ?? ""}`.toLowerCase().includes(t)) : fichas;
  const hoy = hoyISO();
  const tocaHoy = filtradas.filter((f) => f.proximo && f.proximo <= hoy).sort((a, b) => a.proximo!.localeCompare(b.proximo!));
  const proximos = filtradas.filter((f) => f.proximo && f.proximo > hoy).sort((a, b) => a.proximo!.localeCompare(b.proximo!));
  const resto = filtradas
    .filter((f) => !f.proximo)
    .sort((a, b) => (b.cotizaciones[0]?.creada ?? b.creado).localeCompare(a.cotizaciones[0]?.creada ?? a.creado));

  function nuevaCotizacion(f: Ficha) {
    if (items.length && !confirm(`¿Empezar una cotización nueva para ${f.nombre || "este cliente"}? Se quitan los muebles que tienes ahora.`)) return;
    reemplazar({ items: [], cliente: { cliente: f.nombre ?? "", telefono: f.telefono ?? "" } as DatosCliente });
    irAlCotizador();
  }

  const tarjeta = (f: Ficha) => {
    const c = cuando(f.proximo);
    const vistas = f.cotizaciones.reduce((s, q) => s + q.vistas, 0);
    const ref = f.cotizaciones[0];
    const open = abierto === f.clave;
    return (
      <li key={f.clave} className={`cli-item${open ? " abierto" : ""}${c ? ` cli-${c.clase}` : ""}`}>
        <button className="cli-cabeza" aria-expanded={open} onClick={() => setAbierto(open ? null : f.clave)}>
          <span className="cli-avatar" aria-hidden>
            {(f.nombre || "?").trim().charAt(0).toUpperCase()}
          </span>
          <span className="cli-nombre">
            <b>{f.nombre || f.telefono || "Sin nombre"}</b>
            <small>
              {f.cotizaciones.length ? `${f.cotizaciones.length} cotización${f.cotizaciones.length === 1 ? "" : "es"} · ${dinero(ref, f.cotizado)}` : "Sin cotizaciones"}
              {f.aprobado > 0 ? " · ✓ compró" : ""}
              {vistas > 0 && f.pendiente ? " · 👀 la abrió" : ""}
            </small>
          </span>
          {c && <span className={`cli-cuando ${c.clase}`}>{c.texto}</span>}
        </button>

        {open && (
          <div className="cli-detalle">
            {f.telefono ? (
              <a
                className="btn btn-enviar"
                href={`https://wa.me/${f.telefono}?text=${encodeURIComponent(mensajeCliente(f, taller.nombre))}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => void guardarCliente(f.clave, { contactado: true, proximo: f.pendiente ? hoyISO(3) : null })}
              >
                {f.pendiente ? "Hacer seguimiento por WhatsApp" : "Escribirle por WhatsApp"}
              </a>
            ) : (
              <p className="cli-nota-suave">Sin WhatsApp guardado.</p>
            )}
            {f.ultimo_contacto && <p className="cli-nota-suave">Último contacto {hace(f.ultimo_contacto)}.</p>}

            <div className="cli-bloque">
              <span>Recordarme escribirle</span>
              <div className="cli-chips">
                {RECORDAR.map((r) => {
                  const fecha = hoyISO(r.dias);
                  return (
                    <button key={r.dias} className={`chip${f.proximo === fecha ? " activo" : ""}`} onClick={() => void guardarCliente(f.clave, { proximo: fecha })}>
                      {r.etiqueta}
                    </button>
                  );
                })}
              </div>
              <div className="cli-fecha">
                <input type="date" value={f.proximo ?? ""} min={hoy} onChange={(e) => void guardarCliente(f.clave, { proximo: e.target.value || null })} aria-label="Fecha del recordatorio" />
                {f.proximo && (
                  <button className="btn-texto" onClick={() => void guardarCliente(f.clave, { proximo: null })}>
                    Quitar recordatorio
                  </button>
                )}
              </div>
            </div>

            <label className="campo cli-bloque">
              <span>Notas</span>
              <textarea
                rows={3}
                defaultValue={f.nota ?? ""}
                placeholder="Ej.: quiere el clóset en color roble, paga a fin de mes, vive en el barrio…"
                onBlur={(e) => {
                  if (e.target.value !== (f.nota ?? "")) void guardarCliente(f.clave, { nota: e.target.value, nombre: f.nombre ?? undefined, telefono: f.telefono ?? undefined });
                }}
              />
            </label>

            {f.cotizaciones.length > 0 && (
              <div className="cli-bloque">
                <span>Cotizaciones</span>
                <ul className="cli-cots">
                  {f.cotizaciones.map((q) => (
                    <li key={q.id}>
                      <a href={`/c/${q.id}?yo=1`} target="_blank" rel="noreferrer">
                        <b>{q.proyecto || q.numero}</b>
                        <small>
                          {hace(q.creada)}
                          {q.vistas > 0 ? ` · 👀 ${q.vistas}` : ""}
                        </small>
                      </a>
                      <span className={`cli-estado ${q.estado}`}>{q.estado === "enviada" ? "Esperando" : q.estado === "aprobada" ? "Aprobada" : "Perdida"}</span>
                      <strong>{dinero(q, q.total)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="cli-acciones">
              <button className="btn-sec" onClick={() => nuevaCotizacion(f)}>
                Nueva cotización para {(f.nombre || "este cliente").split(" ")[0]}
              </button>
              {clientes.some((c) => c.clave === f.clave) && (
                <button
                  className="hist-borrar"
                  onClick={() => {
                    if (confirm("¿Quitar este cliente de la lista? Sus cotizaciones siguen en Cotizaciones enviadas.")) void borrarCliente(f.clave);
                  }}
                >
                  Quitar cliente
                </button>
              )}
            </div>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="panel-clientes">
      <div className="cli-barra">
        <input type="search" placeholder="Buscar cliente" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar cliente" />
        <button className="btn" onClick={() => setNuevo((v) => !v)} aria-expanded={nuevo}>
          + Cliente
        </button>
      </div>

      {nuevo && (
        <FormNuevo
          alGuardar={(n) => {
            const clave = claveCliente(n.telefono, n.nombre);
            if (!clave) return;
            void guardarCliente(clave, { nombre: n.nombre, telefono: n.telefono.replace(/\D/g, "") || undefined, nota: n.nota || undefined, proximo: hoyISO(1) });
            setNuevo(false);
            setAbierto(clave);
          }}
        />
      )}

      {cargando && !fichas.length ? (
        <p className="hist-nota">Cargando…</p>
      ) : !fichas.length ? (
        <div className="vacio">
          <p>
            Cada vez que envías una cotización por WhatsApp, el cliente aparece aquí con un recordatorio para escribirle a los 2 días. También puedes
            agregar clientes a mano.
          </p>
        </div>
      ) : (
        <>
          {tocaHoy.length > 0 && (
            <section>
              <h3 className="cli-seccion hoy">Hoy toca escribirles · {tocaHoy.length}</h3>
              <ul className="cli-lista">{tocaHoy.map(tarjeta)}</ul>
            </section>
          )}
          {proximos.length > 0 && (
            <section>
              <h3 className="cli-seccion">Próximos recordatorios</h3>
              <ul className="cli-lista">{proximos.map(tarjeta)}</ul>
            </section>
          )}
          {resto.length > 0 && (
            <section>
              <h3 className="cli-seccion">Sin recordatorio</h3>
              <ul className="cli-lista">{resto.map(tarjeta)}</ul>
            </section>
          )}
          {!filtradas.length && <p className="hist-nota">Nadie coincide con “{busca}”.</p>}
        </>
      )}
    </div>
  );
}

function FormNuevo({ alGuardar }: { alGuardar: (n: { nombre: string; telefono: string; nota: string }) => void }) {
  const [n, setN] = useState({ nombre: "", telefono: "", nota: "" });
  const valido = n.nombre.trim() || n.telefono.replace(/\D/g, "");
  return (
    <form
      className="bloque cli-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) alGuardar(n);
      }}
    >
      <div className="grid-campos">
        <label className="campo">
          <span>Nombre</span>
          <input value={n.nombre} onChange={(e) => setN({ ...n, nombre: e.target.value })} autoFocus />
        </label>
        <label className="campo">
          <span>WhatsApp (con indicativo)</span>
          <input type="tel" inputMode="tel" placeholder="57 300 123 4567" value={n.telefono} onChange={(e) => setN({ ...n, telefono: e.target.value })} />
        </label>
      </div>
      <label className="campo">
        <span>Nota</span>
        <textarea rows={2} value={n.nota} placeholder="Qué quiere, cómo llegó a ti…" onChange={(e) => setN({ ...n, nota: e.target.value })} />
      </label>
      <button className="btn" type="submit" disabled={!valido}>
        Guardar cliente
      </button>
    </form>
  );
}
