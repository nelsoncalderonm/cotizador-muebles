"use client";
// Imágenes 3D de cada mueble para la cotización: se dibujan fuera de pantalla con el mismo visor y se guardan en memoria.

import { createRoot } from "react-dom/client";
import { Vista3D } from "@/components/Vista3D";
import { ACABADOS_DEFECTO } from "./acabados";
import type { Escenario } from "./escenarios";
import { modelo3d } from "./motor/modelo3d";
import type { ItemProyecto } from "./motor/proyecto";
import type { Configuracion, ResultadoMueble } from "./motor/tipos";

type Mueble = { item: ItemProyecto; resultado: ResultadoMueble };

const memoria = new Map<string, string>();
let cola: Promise<unknown> = Promise.resolve();

function preferencias(): { escenario: Escenario; decorar: boolean } {
  try {
    return {
      escenario: (localStorage.getItem("inner-muebles:escenario") as Escenario) || "sala",
      decorar: localStorage.getItem("inner-muebles:decorar") !== "no",
    };
  } catch {
    return { escenario: "sala", decorar: true };
  }
}

const clave = (m: Mueble, config: Configuracion, p: ReturnType<typeof preferencias>) =>
  JSON.stringify([m.item.muebleId, m.item.valores, m.item.acabados, config.materiales, p]);

const cuadro = () => new Promise<void>((ok) => requestAnimationFrame(() => ok()));

async function dibujar(m: Mueble, config: Configuracion, p: ReturnType<typeof preferencias>): Promise<string | null> {
  const caja = document.createElement("div");
  caja.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:600px;pointer-events:none";
  caja.setAttribute("aria-hidden", "true");
  document.body.appendChild(caja);
  const raiz = createRoot(caja);
  try {
    const fondo = Number(m.item.valores.fondo ?? 500);
    let capturar: (() => Blob | null) | null = null;
    raiz.render(
      <Vista3D
        modelo={modelo3d(m.resultado, fondo, config)}
        acabados={m.item.acabados ?? ACABADOS_DEFECTO}
        abierto={false}
        escenario={p.escenario}
        mueble={m.item.muebleId}
        decorar={p.decorar}
        onListo={(f) => (capturar = f)}
      />,
    );
    for (let i = 0; i < 40 && !capturar; i++) await cuadro();
    await cuadro();
    await cuadro();
    const blob = (capturar as (() => Blob | null) | null)?.();
    if (!blob) return null;
    // A JPG liviano para que el PDF no pese
    const img = await createImageBitmap(blob);
    const lienzo = document.createElement("canvas");
    lienzo.width = 1200;
    lienzo.height = 900;
    lienzo.getContext("2d")!.drawImage(img, 0, 0, lienzo.width, lienzo.height);
    return lienzo.toDataURL("image/jpeg", 0.86);
  } catch {
    return null;
  } finally {
    raiz.unmount();
    caja.remove();
  }
}

/** Imagen 3D (JPG en data URL) de un mueble; null si el equipo no puede dibujar en 3D. */
export function imagenMueble(m: Mueble, config: Configuracion): Promise<string | null> {
  const p = preferencias();
  const k = clave(m, config, p);
  const lista = memoria.get(k);
  if (lista) return Promise.resolve(lista);
  const tarea = cola.then(async () => {
    const ya = memoria.get(k);
    if (ya) return ya;
    const url = await dibujar(m, config, p);
    if (url) memoria.set(k, url);
    return url;
  });
  cola = tarea.catch(() => null);
  return tarea;
}

/** Imágenes 3D de todos los muebles del proyecto, por uid. */
export async function imagenesProyecto(muebles: Mueble[], config: Configuracion) {
  const salida: Record<string, string> = {};
  for (const m of muebles) {
    const url = await imagenMueble(m, config);
    if (url) salida[m.item.uid] = url;
  }
  return salida;
}
