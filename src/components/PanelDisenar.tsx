"use client";

import { useMemo, useState } from "react";
import { useEstado } from "@/lib/estado";
import { CATALOGO, buscarMueble, valoresPorDefecto } from "@/lib/motor/catalogo";
import { CONFIG_DEFECTO } from "@/lib/motor/defaults";
import type { Parametro } from "@/lib/motor/tipos";
import { VistaMueble } from "./VistaMueble";
import { DictarVoz } from "./DictarVoz";
import { FotoReferencia } from "./FotoReferencia";
import { VisorMueble } from "./VisorMueble";

export function Catalogo({ onElegir }: { onElegir: (id: string) => void }) {
  const miniaturas = useMemo(
    () => CATALOGO.map((d) => ({ d, vista: d.generar(valoresPorDefecto(d), CONFIG_DEFECTO).vista })),
    [],
  );
  const categorias = [...new Set(CATALOGO.map((d) => d.categoria))];
  return (
    <div className="catalogo">
      {categorias.map((cat) => (
        <section key={cat}>
          <h3 className="cat-titulo">{cat}</h3>
          <div className="cat-grid">
            {miniaturas
              .filter((m) => m.d.categoria === cat)
              .map(({ d, vista }) => (
                <button key={d.id} className="cat-item" onClick={() => onElegir(d.id)}>
                  <div className="cat-mini">
                    <VistaMueble vista={vista} cotas={false} />
                  </div>
                  <strong>{d.nombre}</strong>
                  <span>{d.descripcion}</span>
                </button>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CampoParametro({ p, valor, onCambio }: { p: Parametro; valor: number | boolean | string; onCambio: (v: number | boolean | string) => void }) {
  const [texto, setTexto] = useState<string | null>(null);
  if (p.tipo === "si_no")
    return (
      <label className="campo campo-switch">
        <span>{p.etiqueta}</span>
        <input type="checkbox" checked={Boolean(valor)} onChange={(e) => onCambio(e.target.checked)} />
        <i aria-hidden />
      </label>
    );
  if (p.tipo === "opcion")
    return (
      <div className="campo">
        <span>{p.etiqueta}</span>
        <div className="segmentos">
          {p.opciones.map((o) => (
            <button key={o.valor} className={valor === o.valor ? "activo" : ""} onClick={() => onCambio(o.valor)}>
              {o.etiqueta}
            </button>
          ))}
        </div>
      </div>
    );
  const n = Number(valor);
  const fuera = n < p.min || n > p.max;
  if (p.tipo === "entero")
    return (
      <div className="campo">
        <span>{p.etiqueta}</span>
        <div className="stepper">
          <button aria-label="Menos" onClick={() => onCambio(Math.max(p.min, n - 1))} disabled={n <= p.min}>
            −
          </button>
          <output>{n}</output>
          <button aria-label="Más" onClick={() => onCambio(Math.min(p.max, n + 1))} disabled={n >= p.max}>
            +
          </button>
        </div>
        {p.ayuda && <small>{p.ayuda}</small>}
      </div>
    );
  return (
    <label className={`campo${fuera ? " campo-error" : ""}`}>
      <span>{p.etiqueta}</span>
      <div className="input-mm">
        <input
          type="number"
          inputMode="decimal"
          value={texto ?? String(n)}
          min={p.min}
          max={p.max}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            setTexto(e.target.value);
            const v = parseFloat(e.target.value.replace(",", "."));
            if (!isNaN(v)) onCambio(v);
          }}
          onBlur={() => setTexto(null)}
        />
        <em>mm</em>
      </div>
      {fuera ? <small>Entre {p.min} y {p.max} mm</small> : p.ayuda && <small>{p.ayuda}</small>}
    </label>
  );
}

export function PanelDisenar() {
  const { items, seleccion, seleccionar, agregar, actualizarItem, duplicar, eliminar, resultado } = useEstado();
  const [eligiendo, setEligiendo] = useState(false);
  const item = items.find((i) => i.uid === seleccion) ?? null;
  const def = item ? buscarMueble(item.muebleId) : null;
  const res = resultado.muebles.find((m) => m.item.uid === item?.uid)?.resultado;

  if (eligiendo || items.length === 0)
    return (
      <div className="panel">
        <div className="panel-cab">
          <h2>{items.length === 0 ? "Elige el primer mueble" : "Agregar mueble"}</h2>
          {items.length > 0 && (
            <button className="btn-sec" onClick={() => setEligiendo(false)}>
              Cancelar
            </button>
          )}
        </div>
        <div className="entradas">
          {!eligiendo && <DictarVoz />}
          <FotoReferencia />
        </div>
        <Catalogo
          onElegir={(id) => {
            agregar(id);
            setEligiendo(false);
          }}
        />
      </div>
    );

  return (
    <div className="panel">
      <div className="entradas">
        <DictarVoz />
        <FotoReferencia />
      </div>
      <div className="chips" role="tablist">
        {items.map((i) => (
          <button key={i.uid} role="tab" aria-selected={i.uid === seleccion} className={`chip${i.uid === seleccion ? " activo" : ""}`} onClick={() => seleccionar(i.uid)}>
            {i.cantidad > 1 && <b>{i.cantidad}×</b>} {i.nombre}
          </button>
        ))}
        <button className="chip chip-mas" onClick={() => setEligiendo(true)}>
          + Agregar
        </button>
      </div>

      {item && def && res && (
        <div className="editor">
          <div className="editor-vista editor-vista-3d">
            <VisorMueble item={item} res={res} />
          </div>
          <div className="editor-form">
            <label className="campo">
              <span>Nombre en la cotización</span>
              <input type="text" value={item.nombre} onChange={(e) => actualizarItem(item.uid, { nombre: e.target.value })} />
            </label>
            <div className="grid-campos">
              {def.parametros.map((p) => (
                <CampoParametro
                  key={`${item.uid}-${p.clave}`}
                  p={p}
                  valor={item.valores[p.clave] ?? p.defecto}
                  onCambio={(v) => actualizarItem(item.uid, { valores: { ...item.valores, [p.clave]: v } })}
                />
              ))}
              <div className="campo">
                <span>Cantidad de muebles iguales</span>
                <div className="stepper">
                  <button aria-label="Menos" onClick={() => actualizarItem(item.uid, { cantidad: Math.max(1, item.cantidad - 1) })} disabled={item.cantidad <= 1}>
                    −
                  </button>
                  <output>{item.cantidad}</output>
                  <button aria-label="Más" onClick={() => actualizarItem(item.uid, { cantidad: item.cantidad + 1 })}>
                    +
                  </button>
                </div>
              </div>
            </div>
            {res.advertencias.length > 0 && (
              <ul className="avisos">
                {res.advertencias.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
            <div className="acciones">
              <button className="btn-sec" onClick={() => duplicar(item.uid)}>
                Duplicar
              </button>
              <button className="btn-peligro" onClick={() => eliminar(item.uid)}>
                Quitar del proyecto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
