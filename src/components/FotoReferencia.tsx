"use client";
// Copiar un mueble de una foto: el carpintero toma o sube una foto de referencia y la IA arma
// el mueble más parecido del catálogo (medidas, divisiones y colores). Él revisa y lo agrega.

import { useRef, useState } from "react";
import { useEstado } from "@/lib/estado";
import { buscarMueble } from "@/lib/motor/catalogo";
import { comprimir } from "@/lib/fotos";
import { acabado, jaladera, muestraCss } from "@/lib/acabados";
import type { PropuestaReferencia } from "@/lib/referencia";

type Fase = "listo" | "foto" | "leyendo" | "propuesta";

function resumenValores(p: PropuestaReferencia) {
  const def = buscarMueble(p.muebleId);
  if (!def) return [];
  const out: string[] = [];
  for (const par of def.parametros) {
    const v = p.valores[par.clave];
    if (par.tipo === "medida") {
      if (["ancho", "alto", "fondo"].includes(par.clave) || (Number(v) > 0 && Number(v) !== par.defecto)) out.push(`${par.etiqueta}: ${Math.round(Number(v) / 10)} cm`);
    } else if (par.tipo === "entero") {
      if (Number(v) !== par.defecto || /puerta|cajon|cuerpo|columna|entrepa/i.test(par.clave)) out.push(`${par.etiqueta}: ${v}`);
    } else if (par.tipo === "si_no") {
      if (v === true && v !== par.defecto) out.push(par.etiqueta);
    } else {
      const op = par.opciones.find((o) => o.valor === v);
      if (op && v !== par.defecto) out.push(`${par.etiqueta}: ${op.etiqueta}`);
    }
  }
  return out;
}

export function FotoReferencia() {
  const { agregar } = useEstado();
  const [fase, setFase] = useState<Fase>("listo");
  const [imagen, setImagen] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [prop, setProp] = useState<PropuestaReferencia | null>(null);
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  async function elegido(f: File | undefined) {
    if (!f) return;
    setError("");
    try {
      setImagen(await comprimir(f, 1024, 0.8));
      setProp(null);
      setFase("foto");
    } catch {
      setError("No se pudo abrir esa imagen. Prueba con otra (JPG o PNG).");
    }
  }

  async function leer() {
    setFase("leyendo");
    setError("");
    try {
      const r = await fetch("/api/foto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagen, nota }) });
      const d = (await r.json().catch(() => ({}))) as { propuesta?: PropuestaReferencia; error?: string };
      if (!r.ok || !d.propuesta) throw new Error(d.error || "No se pudo leer la foto.");
      setProp(d.propuesta);
      setFase("propuesta");
    } catch (e) {
      setError((e as Error).message);
      setFase("foto");
    }
  }

  function aplicar() {
    if (!prop) return;
    agregar(prop.muebleId, prop.valores, prop.cantidad, { acabados: prop.acabados });
    cerrar();
  }

  function cerrar() {
    setFase("listo");
    setImagen("");
    setNota("");
    setProp(null);
    setError("");
  }

  const entradas = (
    <>
      <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void elegido(e.target.files?.[0]).finally(() => (e.target.value = ""))} />
      <input ref={galeria} type="file" accept="image/*" hidden onChange={(e) => void elegido(e.target.files?.[0]).finally(() => (e.target.value = ""))} />
    </>
  );

  if (fase === "listo")
    return (
      <div className="ref-foto">
        {entradas}
        <button className="btn-ref" onClick={() => camara.current?.click()}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          Copiar de una foto
        </button>
        <button className="btn-texto" onClick={() => galeria.current?.click()}>
          o subir imagen
        </button>
        {error && <p className="avisos">{error}</p>}
      </div>
    );

  return (
    <div className="voz-panel ref-panel" role="dialog" aria-label="Copiar mueble de una foto">
      {entradas}
      <div className="ref-cab">
        {imagen && <img src={imagen} alt="Foto de referencia" className="ref-img" />}
        {fase === "propuesta" && prop ? (
          <div>
            <small className="nota">Se parece a</small>
            <b className="ref-nombre">
              {prop.cantidad > 1 ? `${prop.cantidad}× ` : ""}
              {prop.nombre}
            </b>
            <span className={`ref-conf ${prop.confianza}`}>
              {prop.confianza === "alta" ? "Muy parecido" : prop.confianza === "media" ? "Parecido" : "Aproximado"}
            </span>
          </div>
        ) : (
          <div>
            <b>Foto de referencia</b>
            <p className="nota">La IA busca el mueble más parecido y lo arma con tus medidas y colores. Tú lo revisas antes de agregarlo.</p>
          </div>
        )}
      </div>

      {fase === "foto" && (
        <>
          <label className="campo">
            <span>Medidas o detalles que ya sabes (opcional)</span>
            <input value={nota} placeholder="Ej.: mide 1.60 de ancho, sin zócalo, 4 cajones" onChange={(e) => setNota(e.target.value)} />
          </label>
          {error && <p className="avisos">{error}</p>}
          <div className="acciones">
            <button className="btn-sec" onClick={cerrar}>
              Cancelar
            </button>
            <button className="btn-sec" onClick={() => galeria.current?.click()}>
              Otra foto
            </button>
            <button className="btn" onClick={leer}>
              Armar parecido
            </button>
          </div>
        </>
      )}

      {fase === "leyendo" && (
        <div className="voz-grabando">
          <span className="pulso" aria-hidden />
          <p>Mirando la foto y armando el mueble…</p>
        </div>
      )}

      {fase === "propuesta" && prop && (
        <>
          {prop.explicacion && <p className="ref-expl">{prop.explicacion}</p>}
          <ul className="ref-valores">
            {resumenValores(prop).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="ref-colores">
            {(
              [
                ["Cuerpo", acabado(prop.acabados.cuerpo)],
                ["Frentes", acabado(prop.acabados.frente)],
              ] as const
            ).map(([k, a]) => (
              <span key={k}>
                <i style={{ background: muestraCss(a) }} />
                {k}: {a.nombre}
              </span>
            ))}
            <span>
              <i style={{ background: jaladera(prop.acabados.jaladera).color }} />
              Jaladera: {jaladera(prop.acabados.jaladera).nombre}
            </span>
          </div>
          {prop.diferencias.length > 0 && (
            <div className="ref-dif">
              <b>Para ajustar a mano:</b>
              <ul>
                {prop.diferencias.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="nota">Las medidas son estimadas de la foto. Revísalas antes de cotizar.</p>
          <div className="acciones">
            <button className="btn-sec" onClick={cerrar}>
              Cancelar
            </button>
            <button className="btn-sec" onClick={() => setFase("foto")}>
              Corregir
            </button>
            <button className="btn" onClick={aplicar}>
              Agregar al proyecto
            </button>
          </div>
        </>
      )}
    </div>
  );
}
