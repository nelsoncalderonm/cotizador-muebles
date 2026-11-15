"use client";

import { useEstado } from "@/lib/estado";
import { NOMBRES_PRECIO_HERRAJE } from "@/lib/motor/defaults";
import { enlaceSoporte } from "@/lib/soporte";
import type { ClaveMaterial } from "@/lib/motor/tipos";

function Num({ etiqueta, valor, onCambio, sufijo }: { etiqueta: string; valor: number; onCambio: (n: number) => void; sufijo?: string }) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      <div className="input-mm">
        <input type="number" inputMode="decimal" value={valor} onFocus={(e) => e.target.select()} onChange={(e) => onCambio(parseFloat(e.target.value) || 0)} />
        {sufijo && <em>{sufijo}</em>}
      </div>
    </label>
  );
}

export function PanelPrecios() {
  const { config, setConfig, precios, setPrecios, taller, setTaller, repetirConfiguracion } = useEstado();
  const claves: ClaveMaterial[] = ["cuerpo", "frente", "fondo"];
  return (
    <div className="panel">
      <div className="panel-cab">
        <h2>Mis precios y taller</h2>
      </div>
      <p className="nota">Todo se guarda en este dispositivo y se recalcula al instante.</p>
      <button className="btn btn-sec" onClick={repetirConfiguracion}>
        Repetir la configuración guiada
      </button>

      <details className="bloque plegable" open>
        <summary>Mi taller</summary>
        <div className="grid-campos">
          <label className="campo">
            <span>Nombre del taller</span>
            <input value={taller.nombre} onChange={(e) => setTaller({ ...taller, nombre: e.target.value })} />
          </label>
          <label className="campo">
            <span>Teléfono</span>
            <input type="tel" value={taller.telefono} onChange={(e) => setTaller({ ...taller, telefono: e.target.value })} />
          </label>
          <label className="campo">
            <span>Ciudad</span>
            <input value={taller.ciudad} onChange={(e) => setTaller({ ...taller, ciudad: e.target.value })} />
          </label>
        </div>
      </details>

      <details className="bloque plegable" open>
        <summary>Tableros</summary>
        {claves.map((k) => {
          const m = config.materiales[k];
          const set = (c: Partial<typeof m>) => setConfig({ ...config, materiales: { ...config.materiales, [k]: { ...m, ...c } } });
          return (
            <div key={k} className="tarjeta">
              <label className="campo">
                <span>Nombre</span>
                <input value={m.nombre} onChange={(e) => set({ nombre: e.target.value })} />
              </label>
              <div className="grid-campos">
                <Num etiqueta="Precio por lámina" valor={m.precioLamina} onCambio={(n) => set({ precioLamina: n })} sufijo={precios.simbolo} />
                <Num etiqueta="Espesor" valor={m.espesor} onCambio={(n) => set({ espesor: n })} sufijo="mm" />
                <Num etiqueta="Largo de lámina" valor={m.largoLamina} onCambio={(n) => set({ largoLamina: n })} sufijo="mm" />
                <Num etiqueta="Ancho de lámina" valor={m.anchoLamina} onCambio={(n) => set({ anchoLamina: n })} sufijo="mm" />
              </div>
              <label className="campo campo-switch">
                <span>Tiene veta (no rotar piezas)</span>
                <input type="checkbox" checked={m.veta} onChange={(e) => set({ veta: e.target.checked })} />
                <i aria-hidden />
              </label>
            </div>
          );
        })}
      </details>

      <details className="bloque plegable">
        <summary>Cómo cobrar los tableros</summary>
        <div className="segmentos">
          <button className={precios.cobroLaminas === "proporcional" ? "activo" : ""} onClick={() => setPrecios({ ...precios, cobroLaminas: "proporcional" })}>
            Solo lo que se usa
          </button>
          <button className={precios.cobroLaminas === "completas" ? "activo" : ""} onClick={() => setPrecios({ ...precios, cobroLaminas: "completas" })}>
            Láminas completas
          </button>
        </div>
        {precios.cobroLaminas === "proporcional" && (
          <div className="grid-campos">
            <Num etiqueta="Desperdicio" valor={precios.desperdicioPorcentaje} onCambio={(n) => setPrecios({ ...precios, desperdicioPorcentaje: n })} sufijo="%" />
          </div>
        )}
      </details>

      <details className="bloque plegable">
        <summary>Corte y canto</summary>
        <div className="grid-campos">
          <Num etiqueta="Canto (precio por metro)" valor={precios.cantoPorMetro} onCambio={(n) => setPrecios({ ...precios, cantoPorMetro: n })} sufijo={precios.simbolo} />
          <Num etiqueta="Espesor del canto" valor={config.espesorCanto} onCambio={(n) => setConfig({ ...config, espesorCanto: n })} sufijo="mm" />
          <Num etiqueta="Servicio de corte por lámina" valor={precios.servicioCortePorLamina} onCambio={(n) => setPrecios({ ...precios, servicioCortePorLamina: n })} sufijo={precios.simbolo} />
          <Num etiqueta="Canteado por metro" valor={precios.canteadoPorMetro} onCambio={(n) => setPrecios({ ...precios, canteadoPorMetro: n })} sufijo={precios.simbolo} />
          <Num etiqueta="Grosor de sierra" valor={config.sierra} onCambio={(n) => setConfig({ ...config, sierra: n })} sufijo="mm" />
          <Num etiqueta="Refilado por borde" valor={config.refilado} onCambio={(n) => setConfig({ ...config, refilado: n })} sufijo="mm" />
          <Num etiqueta="Holgura entre frentes" valor={config.holgura} onCambio={(n) => setConfig({ ...config, holgura: n })} sufijo="mm" />
        </div>
      </details>

      <details className="bloque plegable">
        <summary>Herrajes</summary>
        <div className="grid-campos">
          {Object.entries(NOMBRES_PRECIO_HERRAJE).map(([k, nombre]) => (
            <Num key={k} etiqueta={nombre} valor={precios.herrajes[k] ?? 0} onCambio={(n) => setPrecios({ ...precios, herrajes: { ...precios.herrajes, [k]: n } })} sufijo={precios.simbolo} />
          ))}
        </div>
      </details>

      <details className="bloque plegable">
        <summary>Ganancia</summary>
        <div className="grid-campos">
          <Num etiqueta="Mano de obra (% sobre materiales)" valor={precios.manoObraPorcentaje} onCambio={(n) => setPrecios({ ...precios, manoObraPorcentaje: n })} sufijo="%" />
          <Num etiqueta="Utilidad (% sobre costo)" valor={precios.margenPorcentaje} onCambio={(n) => setPrecios({ ...precios, margenPorcentaje: n })} sufijo="%" />
          <Num etiqueta="Otros costos fijos (transporte, instalación)" valor={precios.otrosCostos} onCambio={(n) => setPrecios({ ...precios, otrosCostos: n })} sufijo={precios.simbolo} />
          <Num etiqueta="Impuesto" valor={precios.impuestoPorcentaje} onCambio={(n) => setPrecios({ ...precios, impuestoPorcentaje: n })} sufijo="%" />
        </div>
      </details>

      <details className="bloque plegable">
        <summary>Moneda</summary>
        <div className="grid-campos">
          <label className="campo">
            <span>Símbolo</span>
            <input value={precios.simbolo} onChange={(e) => setPrecios({ ...precios, simbolo: e.target.value })} />
          </label>
          <Num etiqueta="Decimales" valor={precios.decimales} onCambio={(n) => setPrecios({ ...precios, decimales: Math.max(0, Math.min(2, Math.round(n))) })} />
        </div>
      </details>

      <div className="ayuda-soporte">
        <span>
          <b>¿Necesitas ayuda?</b>
          <small>Escríbenos y te respondemos por WhatsApp.</small>
        </span>
        <a className="btn-wa" href={enlaceSoporte("Hola, necesito ayuda con INNER Muebles.")} target="_blank" rel="noreferrer">
          Soporte por WhatsApp
        </a>
      </div>
    </div>
  );
}
