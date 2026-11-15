"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { ACABADOS, ACABADOS_DEFECTO, JALADERAS, acabado, esColorLibre, muestraCss, type AcabadosItem } from "@/lib/acabados";
import { useEstado } from "@/lib/estado";
import { modelo3d } from "@/lib/motor/modelo3d";
import type { ItemProyecto } from "@/lib/motor/proyecto";
import type { ResultadoMueble } from "@/lib/motor/tipos";
import { VistaMueble } from "./VistaMueble";

const Vista3D = dynamic(() => import("./Vista3D").then((m) => m.Vista3D), {
  ssr: false,
  loading: () => <div className="vista3d vista3d-cargando">Cargando 3D…</div>,
});

function ModalAcabados({ valor, onCambio, onCerrar }: { valor: AcabadosItem; onCambio: (a: AcabadosItem) => void; onCerrar: () => void }) {
  const grupo = (titulo: string, clave: "cuerpo" | "frente") => (
    <section>
      <h4>{titulo}</h4>
      <div className="muestras">
        {ACABADOS.map((a) => (
          <button key={a.id} className={valor[clave] === a.id ? "activo" : ""} onClick={() => onCambio({ ...valor, [clave]: a.id })} aria-pressed={valor[clave] === a.id}>
            <i style={{ background: muestraCss(a) }} />
            <span>{a.nombre}</span>
          </button>
        ))}
        <label className={`muestra-libre${esColorLibre(valor[clave]) ? " activo" : ""}`} title="Elegir cualquier color">
          <i style={{ background: esColorLibre(valor[clave]) ? valor[clave] : "conic-gradient(#e44, #ec4, #4c6, #4ae, #a4e, #e44)" }} />
          <span>Otro color</span>
          <input type="color" value={esColorLibre(valor[clave]) ? valor[clave] : "#cc8844"} onChange={(e) => onCambio({ ...valor, [clave]: e.target.value })} />
        </label>
      </div>
    </section>
  );
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" role="dialog" aria-label="Colores y acabados" onClick={(e) => e.stopPropagation()}>
        <div className="modal-cab">
          <h3>Colores y acabados</h3>
          <button className="btn-cerrar" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </div>
        {grupo("Puertas y frentes", "frente")}
        {grupo("Cuerpo del mueble", "cuerpo")}
        <section>
          <h4>Jaladeras</h4>
          <div className="muestras">
            {JALADERAS.map((j) => (
              <button key={j.id} className={valor.jaladera === j.id ? "activo" : ""} onClick={() => onCambio({ ...valor, jaladera: j.id })} aria-pressed={valor.jaladera === j.id}>
                <i style={{ background: `linear-gradient(135deg, #fff8 0%, ${j.color} 35%, ${j.color} 65%, #0004 100%)` }} />
                <span>{j.nombre}</span>
              </button>
            ))}
          </div>
        </section>
        <button className="btn" onClick={onCerrar}>
          Listo
        </button>
      </div>
    </div>
  );
}

export function VisorMueble({ item, res }: { item: ItemProyecto; res: ResultadoMueble }) {
  const { config, actualizarItem } = useEstado();
  const [modo, setModo] = useState<"3d" | "plano">("3d");
  const [abierto, setAbierto] = useState(false);
  const [colores, setColores] = useState(false);
  const capturar = useRef<(() => Blob | null) | null>(null);
  const acabados = item.acabados ?? ACABADOS_DEFECTO;
  const fondo = Number(item.valores.fondo ?? 500);
  const modelo = useMemo(() => modelo3d(res, fondo, config), [res, fondo, config]);
  const tieneMoviles = modelo.bloques.some((b) => b.movil);

  async function compartirImagen() {
    const blob = capturar.current?.();
    if (!blob) return;
    const nombre = `${item.nombre.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.png`;
    const archivo = new File([blob], nombre, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (/Android|iPhone|iPad/i.test(navigator.userAgent) && nav.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: item.nombre });
        return;
      } catch {
        /* cancelado */
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <div className="visor">
      {modo === "3d" ? (
        <Vista3D modelo={modelo} acabados={acabados} abierto={abierto} onListo={(f) => (capturar.current = f)} />
      ) : (
        <div className="visor-plano">
          <VistaMueble vista={res.vista} />
        </div>
      )}
      <div className="visor-barra">
        <div className="segmentos visor-modo">
          <button className={modo === "3d" ? "activo" : ""} onClick={() => setModo("3d")}>
            3D
          </button>
          <button className={modo === "plano" ? "activo" : ""} onClick={() => setModo("plano")}>
            Medidas
          </button>
        </div>
        {modo === "3d" && (
          <div className="visor-acciones">
            <button className="btn-flotante" onClick={() => setColores(true)}>
              <i className="mini-muestras" aria-hidden>
                <b style={{ background: muestraCss(acabado(acabados.frente)) }} />
                <b style={{ background: muestraCss(acabado(acabados.cuerpo)) }} />
              </i>
              Colores
            </button>
            {tieneMoviles && (
              <button className="btn-flotante" onClick={() => setAbierto(!abierto)}>
                {abierto ? "Cerrar" : "Abrir"}
              </button>
            )}
            <button className="btn-flotante" onClick={compartirImagen} aria-label="Compartir imagen">
              Imagen
            </button>
          </div>
        )}
      </div>
      {colores && <ModalAcabados valor={acabados} onCambio={(a) => actualizarItem(item.uid, { acabados: a })} onCerrar={() => setColores(false)} />}
    </div>
  );
}
