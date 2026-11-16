"use client";

import { InputNumero } from "./InputNumero";
import { useRef, useState } from "react";
import { MAX_TRABAJOS, useFotos } from "@/lib/fotos";

import { useEstado } from "@/lib/estado";
import { NOMBRES_PRECIO_HERRAJE } from "@/lib/motor/defaults";
import { useCuenta } from "@/lib/cuenta";
import { enlaceSoporte } from "@/lib/soporte";
import type { ClaveMaterial } from "@/lib/motor/tipos";

function Num({ etiqueta, valor, onCambio, sufijo, dinero }: { etiqueta: string; valor: number; onCambio: (n: number) => void; sufijo?: string; dinero?: boolean }) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      <div className="input-mm">
        {dinero ? (
          <InputNumero valor={valor} onCambio={onCambio} />
        ) : (
          <input type="number" inputMode="decimal" value={valor} onFocus={(e) => e.target.select()} onChange={(e) => onCambio(parseFloat(e.target.value) || 0)} />
        )}
        {sufijo && <em>{sufijo}</em>}
      </div>
    </label>
  );
}

function MisFotos() {
  const { fotos, ponerLogo, quitarLogo, agregarTrabajos, tituloTrabajo, quitarTrabajo } = useFotos();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const logoInput = useRef<HTMLInputElement>(null);
  const trabajosInput = useRef<HTMLInputElement>(null);
  const quedan = MAX_TRABAJOS - fotos.trabajos.length;

  async function conEspera(f: () => Promise<boolean>) {
    setError("");
    setOcupado(true);
    try {
      if (!(await f())) setError("No hay espacio en este celular para más fotos. Quita alguna e intenta de nuevo.");
    } catch {
      setError("No se pudo leer esa imagen. Prueba con una foto JPG o PNG.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <details className="bloque plegable" open>
      <summary>Mi logo y fotos de mis trabajos</summary>
      <p className="nota">Tu logo sale en los PDF. Las fotos de trabajos que ya hiciste van al final de la cotización para que el cliente confíe en ti.</p>

      <div className="mi-logo">
        <div className="mi-logo-caja">
          {fotos.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotos.logo} alt="Logo del taller" />
          ) : (
            <span>Sin logo</span>
          )}
        </div>
        <div className="mi-logo-acciones">
          <button className="btn-sec" disabled={ocupado} onClick={() => logoInput.current?.click()}>
            {fotos.logo ? "Cambiar logo" : "Subir logo o foto del taller"}
          </button>
          {fotos.logo && (
            <button className="btn-peligro" onClick={quitarLogo}>
              Quitar
            </button>
          )}
        </div>
        <input
          ref={logoInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) conEspera(() => ponerLogo(f));
          }}
        />
      </div>

      <div className="mis-trabajos">
        {fotos.trabajos.map((t) => (
          <figure key={t.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.url} alt={t.titulo || "Trabajo realizado"} />
            <input value={t.titulo} placeholder="Ej.: Cocina en Chía" maxLength={40} onChange={(e) => tituloTrabajo(t.id, e.target.value)} aria-label="Nombre del trabajo" />
            <button className="mis-trabajos-quitar" onClick={() => quitarTrabajo(t.id)} aria-label="Quitar foto">
              ×
            </button>
          </figure>
        ))}
        {quedan > 0 && (
          <button className="mis-trabajos-agregar" disabled={ocupado} onClick={() => trabajosInput.current?.click()}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            {ocupado ? "Guardando…" : "Agregar fotos"}
            <small>Quedan {quedan}</small>
          </button>
        )}
        <input
          ref={trabajosInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const lista = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (lista.length) conEspera(() => agregarTrabajos(lista));
          }}
        />
      </div>
      {error && (
        <p className="acceso-error" role="alert">
          {error}
        </p>
      )}
      <p className="nota">Las fotos quedan guardadas en este celular o computador.</p>
    </details>
  );
}

export function PanelPrecios() {
  const { config, setConfig, precios, setPrecios, taller, setTaller, repetirConfiguracion } = useEstado();
  const { activas, correo, cuenta, salir } = useCuenta();
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

      <MisFotos />

      <details className="bloque plegable">
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
                <Num etiqueta="Precio por lámina" valor={m.precioLamina} onCambio={(n) => set({ precioLamina: n })} sufijo={precios.simbolo} dinero />
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
          <Num etiqueta="Canto (precio por metro)" valor={precios.cantoPorMetro} onCambio={(n) => setPrecios({ ...precios, cantoPorMetro: n })} sufijo={precios.simbolo} dinero />
          <Num etiqueta="Espesor del canto" valor={config.espesorCanto} onCambio={(n) => setConfig({ ...config, espesorCanto: n })} sufijo="mm" />
          <Num etiqueta="Servicio de corte por lámina" valor={precios.servicioCortePorLamina} onCambio={(n) => setPrecios({ ...precios, servicioCortePorLamina: n })} sufijo={precios.simbolo} dinero />
          <Num etiqueta="Canteado por metro" valor={precios.canteadoPorMetro} onCambio={(n) => setPrecios({ ...precios, canteadoPorMetro: n })} sufijo={precios.simbolo} dinero />
          <Num etiqueta="Grosor de sierra" valor={config.sierra} onCambio={(n) => setConfig({ ...config, sierra: n })} sufijo="mm" />
          <Num etiqueta="Refilado por borde" valor={config.refilado} onCambio={(n) => setConfig({ ...config, refilado: n })} sufijo="mm" />
          <Num etiqueta="Holgura entre frentes" valor={config.holgura} onCambio={(n) => setConfig({ ...config, holgura: n })} sufijo="mm" />
        </div>
      </details>

      <details className="bloque plegable">
        <summary>Herrajes</summary>
        <div className="grid-campos">
          {Object.entries(NOMBRES_PRECIO_HERRAJE).map(([k, nombre]) => (
            <Num key={k} etiqueta={nombre} valor={precios.herrajes[k] ?? 0} onCambio={(n) => setPrecios({ ...precios, herrajes: { ...precios.herrajes, [k]: n } })} sufijo={precios.simbolo} dinero />
          ))}
        </div>
      </details>

      <details className="bloque plegable">
        <summary>Ganancia</summary>
        <div className="grid-campos">
          <Num etiqueta="Mano de obra (% sobre materiales)" valor={precios.manoObraPorcentaje} onCambio={(n) => setPrecios({ ...precios, manoObraPorcentaje: n })} sufijo="%" />
          <Num etiqueta="Utilidad (% sobre costo)" valor={precios.margenPorcentaje} onCambio={(n) => setPrecios({ ...precios, margenPorcentaje: n })} sufijo="%" />
          <Num etiqueta="Otros costos fijos (transporte, instalación)" valor={precios.otrosCostos} onCambio={(n) => setPrecios({ ...precios, otrosCostos: n })} sufijo={precios.simbolo} dinero />
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

      {activas && correo && (
        <div className="ayuda-soporte">
          <span>
            <b>Mi cuenta</b>
            <small>{correo}</small>
          </span>
          <span className="cuenta-acciones">
            {cuenta?.es_dueno && (
              <a className="btn-sec" href="/admin">
                Panel de dueños
              </a>
            )}
            <button className="btn-sec" onClick={salir}>
              Cerrar sesión
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
