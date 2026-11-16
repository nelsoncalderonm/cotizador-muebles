"use client";

import { InputNumero } from "./InputNumero";
// Configuración inicial paso a paso: taller, país y moneda, tablero habitual, corte y ganancia.
// Todo queda en un borrador y se guarda al terminar; "Saltar" deja los valores de referencia.

import { useMemo, useState } from "react";
import { formatoDinero, useEstado, type DatosTaller } from "@/lib/estado";
import { buscarMueble, valoresPorDefecto } from "@/lib/motor/catalogo";
import { calcularProyecto, type Precios } from "@/lib/motor/proyecto";
import type { ClaveMaterial, Configuracion } from "@/lib/motor/tipos";
import { LAMINAS_COMUNES, PAISES, referenciaPais } from "@/lib/paises";

const PASOS = ["Tu taller", "Tableros", "Corte y canto", "Tu ganancia"];

function Dinero({ etiqueta, valor, onCambio, simbolo, ayuda }: { etiqueta: string; valor: number; onCambio: (n: number) => void; simbolo: string; ayuda?: string }) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      <div className="input-mm">
        <InputNumero valor={valor} onCambio={onCambio} />
        <em>{simbolo}</em>
      </div>
      {ayuda && <small>{ayuda}</small>}
    </label>
  );
}

function Opciones<T extends string | number>({ valor, opciones, onCambio }: { valor: T; opciones: { id: T; etiqueta: string }[]; onCambio: (v: T) => void }) {
  return (
    <div className="onb-opciones">
      {opciones.map((o) => (
        <button key={String(o.id)} type="button" className={valor === o.id ? "activo" : ""} aria-pressed={valor === o.id} onClick={() => onCambio(o.id)}>
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

export function Onboarding() {
  const { config: cfgGuardada, precios: preGuardados, taller: tallerGuardado, terminarConfiguracion } = useEstado();
  const [paso, setPaso] = useState(-1); // -1 = bienvenida, PASOS.length = final
  const [taller, setTaller] = useState<DatosTaller>({ ...tallerGuardado, pais: tallerGuardado.pais ?? "co" });
  const [config, setConfig] = useState<Configuracion>(cfgGuardada);
  const [precios, setPrecios] = useState<Precios>(preGuardados);
  const [quienCorta, setQuienCorta] = useState<"proveedor" | "yo">(preGuardados.servicioCortePorLamina > 0 ? "proveedor" : "yo");

  const elegirPais = (id: string) => {
    const p = PAISES.find((x) => x.id === id) ?? PAISES[0];
    const ref = referenciaPais(p);
    setTaller((t) => ({ ...t, pais: id }));
    // al cambiar de país se parte de sus precios de referencia, conservando ganancia y forma de cobro
    setConfig(ref.config);
    setPrecios((pr) => ({ ...ref.precios, manoObraPorcentaje: pr.manoObraPorcentaje, margenPorcentaje: pr.margenPorcentaje, cobroLaminas: pr.cobroLaminas, desperdicioPorcentaje: pr.desperdicioPorcentaje }));
    setQuienCorta("proveedor");
  };

  const setMaterial = (k: ClaveMaterial, c: Partial<Configuracion["materiales"][ClaveMaterial]>) =>
    setConfig((cfg) => ({ ...cfg, materiales: { ...cfg.materiales, [k]: { ...cfg.materiales[k], ...c } } }));
  const setLamina = (largo: number, ancho: number) =>
    setConfig((cfg) => ({
      ...cfg,
      materiales: Object.fromEntries(Object.entries(cfg.materiales).map(([k, m]) => [k, { ...m, largoLamina: largo, anchoLamina: ancho }])) as Configuracion["materiales"],
    }));
  const setEspesor = (e: number) =>
    setConfig((cfg) => ({
      ...cfg,
      materiales: {
        ...cfg.materiales,
        cuerpo: { ...cfg.materiales.cuerpo, espesor: e, nombre: `Melamina ${e} mm (cuerpo)` },
        frente: { ...cfg.materiales.frente, espesor: e, nombre: `Melamina ${e} mm (frentes)` },
      },
    }));

  const preciosFinales = useMemo<Precios>(() => (quienCorta === "yo" ? { ...precios, servicioCortePorLamina: 0, canteadoPorMetro: 0 } : precios), [precios, quienCorta]);

  // Ejemplo en vivo: cuánto quedaría un mueble bajo de cocina con estos precios
  const ejemplo = useMemo(() => {
    const def = buscarMueble("bajo_cocina");
    if (!def) return null;
    const r = calcularProyecto([{ uid: "ej", muebleId: def.id, nombre: def.nombre, valores: valoresPorDefecto(def), cantidad: 1 }], config, preciosFinales);
    return r;
  }, [config, preciosFinales]);

  const m = config.materiales;
  const s = precios.simbolo;
  const laminaActual = `${m.cuerpo.largoLamina}x${m.cuerpo.anchoLamina}`;
  const laminas = LAMINAS_COMUNES.some(([l, a]) => `${l}x${a}` === laminaActual) ? LAMINAS_COMUNES : [...LAMINAS_COMUNES, [m.cuerpo.largoLamina, m.cuerpo.anchoLamina] as [number, number]];

  const terminar = () => terminarConfiguracion({ config, precios: preciosFinales, taller });

  return (
    <div className="onb" role="dialog" aria-modal="true" aria-label="Configuración inicial">
      <div className="onb-caja">
        {paso >= 0 && paso < PASOS.length && (
          <div className="onb-progreso">
            <div className="onb-barra" aria-hidden>
              <i style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }} />
            </div>
            <span>
              Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}
            </span>
          </div>
        )}

        <div className="onb-cuerpo">
          {paso === -1 && (
            <div className="onb-centro">
              <div className="onb-icono" aria-hidden>
                <svg viewBox="0 0 48 48">
                  <path d="M8 40V14l16-8 16 8v26M8 24h32M18 40V30h12v10" />
                </svg>
              </div>
              <h2>Deja tu taller listo en 1 minuto</h2>
              <p>Te hacemos 4 preguntas sobre tus tableros y precios. Con eso, cada cotización sale con tus números reales.</p>
              <ul className="onb-lista">
                <li>Tu nombre y WhatsApp salen en los PDF</li>
                <li>Precios de partida según tu país</li>
                <li>Todo lo puedes cambiar después en “Mis precios”</li>
              </ul>
            </div>
          )}

          {paso === 0 && (
            <>
              <h2>¿Cómo se llama tu taller?</h2>
              <p className="onb-sub">Aparece en la cotización y en los planos que envías.</p>
              <label className="campo">
                <span>Nombre del taller o tu nombre</span>
                <input autoFocus value={taller.nombre} placeholder="Ej. Muebles Rodríguez" onChange={(e) => setTaller({ ...taller, nombre: e.target.value })} />
              </label>
              <div className="grid-campos">
                <label className="campo">
                  <span>WhatsApp</span>
                  <input type="tel" inputMode="tel" value={taller.telefono} placeholder="Ej. 300 123 4567" onChange={(e) => setTaller({ ...taller, telefono: e.target.value })} />
                </label>
                <label className="campo">
                  <span>Ciudad</span>
                  <input value={taller.ciudad} onChange={(e) => setTaller({ ...taller, ciudad: e.target.value })} />
                </label>
              </div>
              <h3>¿En qué país trabajas?</h3>
              <p className="onb-sub">Define la moneda y los precios de partida.</p>
              <div className="onb-paises">
                {PAISES.map((p) => (
                  <button key={p.id} type="button" className={taller.pais === p.id ? "activo" : ""} aria-pressed={taller.pais === p.id} onClick={() => elegirPais(p.id)}>
                    <b aria-hidden>{p.bandera}</b>
                    {p.nombre}
                  </button>
                ))}
              </div>
            </>
          )}

          {paso === 1 && (
            <>
              <h2>¿Con qué tablero trabajas?</h2>
              <p className="onb-sub">El que más usas. Con esto calculamos cortes y cuántas láminas necesitas.</p>
              <h3>Espesor</h3>
              <Opciones
                valor={m.cuerpo.espesor}
                opciones={[15, 16, 18].map((e) => ({ id: e, etiqueta: `${e} mm` }))}
                onCambio={setEspesor}
              />
              <h3>Tamaño de la lámina</h3>
              <Opciones
                valor={laminaActual}
                opciones={laminas.map(([l, a]) => ({ id: `${l}x${a}`, etiqueta: `${(l / 1000).toFixed(2)} × ${(a / 1000).toFixed(2)} m` }))}
                onCambio={(v) => {
                  const [l, a] = v.split("x").map(Number);
                  setLamina(l, a);
                }}
              />
              <h3>¿Cuánto te cuesta la lámina?</h3>
              <div className="grid-campos">
                <Dinero etiqueta="Melamina blanca (cuerpo)" valor={m.cuerpo.precioLamina} onCambio={(n) => setMaterial("cuerpo", { precioLamina: n })} simbolo={s} />
                <Dinero etiqueta="Melamina de color o madera (puertas)" valor={m.frente.precioLamina} onCambio={(n) => setMaterial("frente", { precioLamina: n })} simbolo={s} />
                <Dinero etiqueta="Fondo delgado (HDF / MDF 3 mm)" valor={m.fondo.precioLamina} onCambio={(n) => setMaterial("fondo", { precioLamina: n })} simbolo={s} />
              </div>
              <p className="nota">Pusimos precios de referencia. Cámbialos por los de tu proveedor.</p>
            </>
          )}

          {paso === 2 && (
            <>
              <h2>¿Quién corta y pega el canto?</h2>
              <Opciones
                valor={quienCorta}
                opciones={[
                  { id: "proveedor", etiqueta: "Mi proveedor" },
                  { id: "yo", etiqueta: "Yo, en mi taller" },
                ]}
                onCambio={setQuienCorta}
              />
              <div className="grid-campos onb-arriba">
                <Dinero etiqueta="Canto (precio por metro)" valor={precios.cantoPorMetro} onCambio={(n) => setPrecios({ ...precios, cantoPorMetro: n })} simbolo={s} />
                {quienCorta === "proveedor" && (
                  <>
                    <Dinero etiqueta="Corte por lámina" valor={precios.servicioCortePorLamina} onCambio={(n) => setPrecios({ ...precios, servicioCortePorLamina: n })} simbolo={s} />
                    <Dinero etiqueta="Pegado de canto por metro" valor={precios.canteadoPorMetro} onCambio={(n) => setPrecios({ ...precios, canteadoPorMetro: n })} simbolo={s} />
                  </>
                )}
              </div>
              {quienCorta === "yo" && <p className="nota">No se cobra servicio de corte ni de canteado; tu trabajo entra en la mano de obra.</p>}
              <h3>¿Cómo le cobras el tablero al cliente?</h3>
              <Opciones
                valor={precios.cobroLaminas}
                opciones={[
                  { id: "proporcional", etiqueta: "Solo lo que se usa" },
                  { id: "completas", etiqueta: "Láminas completas" },
                ]}
                onCambio={(v) => setPrecios({ ...precios, cobroLaminas: v })}
              />
              <p className="nota">
                {precios.cobroLaminas === "proporcional"
                  ? `Cobras el pedazo usado más ${precios.desperdicioPorcentaje} % de desperdicio. Sirve si el sobrante lo usas en otro trabajo.`
                  : "Cobras cada lámina entera aunque sobre. Sirve si compras el tablero solo para ese trabajo."}
              </p>
            </>
          )}

          {paso === 3 && (
            <>
              <h2>¿Cuánto quieres ganar?</h2>
              <p className="onb-sub">Se suma solo a cada cotización.</p>
              <h3>Mano de obra (sobre materiales)</h3>
              <Opciones
                valor={precios.manoObraPorcentaje}
                opciones={[30, 40, 50, 60, 80].map((n) => ({ id: n, etiqueta: `${n} %` }))}
                onCambio={(n) => setPrecios({ ...precios, manoObraPorcentaje: n })}
              />
              <h3>Utilidad del taller (sobre el costo)</h3>
              <Opciones
                valor={precios.margenPorcentaje}
                opciones={[15, 20, 30, 40, 50].map((n) => ({ id: n, etiqueta: `${n} %` }))}
                onCambio={(n) => setPrecios({ ...precios, margenPorcentaje: n })}
              />
              {ejemplo && (
                <div className="onb-ejemplo">
                  <span>Ejemplo: mueble bajo de cocina de 60 cm</span>
                  <div>
                    <p>
                      Materiales <b>{formatoDinero(ejemplo.subtotalMateriales, precios)}</b>
                    </p>
                    <p>
                      Le cobras al cliente <strong>{formatoDinero(ejemplo.total, precios)}</strong>
                    </p>
                    <p>
                      Te quedan <b className="ok">{formatoDinero(ejemplo.total - ejemplo.subtotalMateriales, precios)}</b>
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {paso === PASOS.length && (
            <div className="onb-centro">
              <div className="onb-icono listo" aria-hidden>
                <svg viewBox="0 0 48 48">
                  <path d="M12 25l8 8 16-18" />
                </svg>
              </div>
              <h2>{taller.nombre ? `¡Listo, ${taller.nombre}!` : "¡Todo listo!"}</h2>
              <p>Ya puedes cotizar con tus precios. Elige un mueble, pon las medidas y envía la cotización por WhatsApp.</p>
              <ul className="onb-resumen">
                <li>
                  <span>Tablero</span>
                  <b>
                    {m.cuerpo.espesor} mm · {(m.cuerpo.largoLamina / 1000).toFixed(2)} × {(m.cuerpo.anchoLamina / 1000).toFixed(2)} m
                  </b>
                </li>
                <li>
                  <span>Lámina blanca</span>
                  <b>{formatoDinero(m.cuerpo.precioLamina, precios)}</b>
                </li>
                <li>
                  <span>Mano de obra + utilidad</span>
                  <b>
                    {precios.manoObraPorcentaje} % + {precios.margenPorcentaje} %
                  </b>
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="onb-pie">
          {paso === -1 ? (
            <>
              <button className="btn" onClick={() => setPaso(0)}>
                Empezar
              </button>
              <button className="onb-saltar" onClick={() => terminarConfiguracion()}>
                Saltar por ahora
              </button>
            </>
          ) : paso === PASOS.length ? (
            <button className="btn" onClick={terminar}>
              Crear mi primer mueble
            </button>
          ) : (
            <div className="onb-nav">
              <button className="btn btn-sec" onClick={() => setPaso(paso - 1)}>
                Atrás
              </button>
              <button className="btn" onClick={() => setPaso(paso + 1)}>
                {paso === PASOS.length - 1 ? "Terminar" : "Siguiente"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
