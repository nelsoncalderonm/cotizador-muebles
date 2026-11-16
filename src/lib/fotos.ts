"use client";
// Logo del taller y fotos de trabajos del carpintero. Se guardan comprimidas en este dispositivo,
// aparte del proyecto, para no volver lento el guardado de cada cambio.

import { useCallback, useEffect, useState } from "react";

export interface FotoTrabajo {
  id: string;
  url: string; // JPG en data URL
  titulo: string;
}

export interface Fotos {
  logo: string | null;
  trabajos: FotoTrabajo[];
}

const CLAVE = "inner-muebles:fotos";
export const MAX_TRABAJOS = 6;
const VACIO: Fotos = { logo: null, trabajos: [] };
export const EVENTO_FOTOS = "inner-muebles:fotos-cambio";
const EVENTO = EVENTO_FOTOS;

export function leerFotos(): Fotos {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) || "null");
    return { logo: g?.logo ?? null, trabajos: Array.isArray(g?.trabajos) ? g.trabajos : [] };
  } catch {
    return VACIO;
  }
}

function guardar(f: Fotos, origen: "usuario" | "nube" = "usuario"): boolean {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(f));
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: origen }));
    return true;
  } catch {
    return false; // sin espacio
  }
}

/** Pone en este dispositivo el logo y las fotos guardadas en la cuenta. */
export function aplicarFotosNube(f: Partial<Fotos> | null) {
  return guardar({ logo: f?.logo ?? null, trabajos: Array.isArray(f?.trabajos) ? f.trabajos : [] }, "nube");
}

/** Reduce una foto del celular (varios MB) a una imagen liviana. */
export async function comprimir(archivo: File, lado: number, calidad = 0.78, fondo = "#ffffff"): Promise<string> {
  const bmp = await createImageBitmap(archivo, { imageOrientation: "from-image" } as ImageBitmapOptions).catch(() => createImageBitmap(archivo));
  const esc = Math.min(1, lado / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * esc);
  c.height = Math.round(bmp.height * esc);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = fondo; // los PNG con transparencia quedan sobre blanco
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c.toDataURL("image/jpeg", calidad);
}

export function useFotos() {
  const [fotos, setFotos] = useState<Fotos>(VACIO);
  useEffect(() => {
    const leer = () => setFotos(leerFotos());
    leer();
    window.addEventListener(EVENTO, leer);
    window.addEventListener("storage", leer);
    return () => {
      window.removeEventListener(EVENTO, leer);
      window.removeEventListener("storage", leer);
    };
  }, []);

  const cambiar = useCallback((f: (actual: Fotos) => Fotos) => guardar(f(leerFotos())), []);

  return {
    fotos,
    ponerLogo: (archivo: File) => guardarLogo(archivo, cambiar),
    quitarLogo: () => cambiar((a) => ({ ...a, logo: null })),
    agregarTrabajos: async (archivos: File[]) => {
      let ok = true;
      for (const archivo of archivos) {
        if (leerFotos().trabajos.length >= MAX_TRABAJOS) break;
        const url = await comprimir(archivo, 1200, 0.74);
        ok = cambiar((a) => ({ ...a, trabajos: [...a.trabajos, { id: Math.random().toString(36).slice(2, 9), url, titulo: "" }] })) && ok;
      }
      return ok;
    },
    tituloTrabajo: (id: string, titulo: string) => cambiar((a) => ({ ...a, trabajos: a.trabajos.map((t) => (t.id === id ? { ...t, titulo } : t)) })),
    quitarTrabajo: (id: string) => cambiar((a) => ({ ...a, trabajos: a.trabajos.filter((t) => t.id !== id) })),
  };
}

async function guardarLogo(archivo: File, cambiar: (f: (a: Fotos) => Fotos) => boolean) {
  const url = await comprimir(archivo, 480, 0.88);
  return cambiar((a) => ({ ...a, logo: url }));
}
