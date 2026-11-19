"use client";
// Guarda en la cuenta del carpintero su proyecto, precios, configuración, logo y fotos,
// para que lo encuentre igual en el celular y en el computador.
// Regla: lo último que se guardó gana. Si en este dispositivo hay cambios sin subir, se suben.

import { useEffect, useRef } from "react";
import { useCuenta } from "./cuenta";
import { useEstado, type Guardado } from "./estado";
import { EVENTO_FOTOS, aplicarFotosNube, leerFotos } from "./fotos";
import { cuentasActivas, supabase } from "./supabase";

type Parte = "estado" | "fotos";
interface Marca {
  /** Fecha (del servidor) de lo último que este dispositivo subió o bajó. */
  sync: string | null;
  /** Hay cambios hechos aquí que todavía no están en la cuenta. */
  sucio: boolean;
}
interface Marcas {
  correo: string;
  estado: Marca;
  fotos: Marca;
}

const CLAVE = "inner-muebles:nube";
const VACIA: Marca = { sync: null, sucio: false };

function leerMarcas(correo: string): Marcas {
  try {
    const m = JSON.parse(localStorage.getItem(CLAVE) || "null") as Marcas | null;
    if (m?.correo === correo) return m;
  } catch {
    /* nada */
  }
  return { correo, estado: { ...VACIA }, fotos: { ...VACIA } };
}

function escribirMarca(correo: string, parte: Parte, cambio: Partial<Marca>) {
  const m = leerMarcas(correo);
  m[parte] = { ...m[parte], ...cambio };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(m));
  } catch {
    /* sin almacenamiento */
  }
}

interface Remoto {
  estado: Partial<Guardado> | null;
  estado_actualizado: string | null;
  fotos: { logo: string | null; trabajos: [] } | null;
  fotos_actualizado: string | null;
}

export function SincronizarNube() {
  const { correo } = useCuenta();
  const estado = useEstado();
  const { items, config, precios, cliente, taller, configurado, proyectos, proyectoId, listo, reemplazar } = estado;
  const datos = { items, config, precios, cliente, taller, configurado, proyectos, proyectoId };
  const datosRef = useRef(datos);
  datosRef.current = datos;
  const reemplazarRef = useRef(reemplazar);
  reemplazarRef.current = reemplazar;
  const aplicando = useRef(false);
  const primera = useRef(true);
  const relojes = useRef<Partial<Record<Parte, ReturnType<typeof setTimeout>>>>({});

  const activo = cuentasActivas && Boolean(correo) && listo;

  // Sube una parte; si falla queda marcada como pendiente y se reintenta después
  const subir = useRef<(parte: Parte) => Promise<void>>(async () => {});
  subir.current = async (parte: Parte) => {
    if (!correo) return;
    const args = parte === "estado" ? { p_estado: datosRef.current } : { p_fotos: leerFotos() };
    const { data, error } = await supabase().rpc("im_guardar_datos", args);
    if (!error && data) escribirMarca(correo, parte, { sync: String(data), sucio: false });
  };

  const programar = (parte: Parte) => {
    if (!correo) return;
    escribirMarca(correo, parte, { sucio: true });
    clearTimeout(relojes.current[parte]);
    relojes.current[parte] = setTimeout(() => void subir.current(parte).catch(() => {}), 2000);
  };

  // Al entrar y cada vez que se vuelve a la app: trae lo de la cuenta o sube lo de aquí
  useEffect(() => {
    if (!activo || !correo) return;
    let vivo = true;
    let ultima = 0;
    const conciliar = async () => {
      if (Date.now() - ultima < 20_000) return;
      ultima = Date.now();
      const { data, error } = await supabase().rpc("im_leer_datos");
      if (!vivo || error) return;
      const r = (data as Remoto | null) ?? null;
      const m = leerMarcas(correo);

      if (r?.estado && r.estado_actualizado && r.estado_actualizado !== m.estado.sync && !m.estado.sucio) {
        aplicando.current = true;
        reemplazarRef.current(r.estado);
        escribirMarca(correo, "estado", { sync: r.estado_actualizado, sucio: false });
      } else if (m.estado.sucio || !r?.estado) {
        await subir.current("estado").catch(() => {});
      }

      if (r?.fotos && r.fotos_actualizado && r.fotos_actualizado !== m.fotos.sync && !m.fotos.sucio) {
        aplicarFotosNube(r.fotos);
        escribirMarca(correo, "fotos", { sync: r.fotos_actualizado, sucio: false });
      } else if (m.fotos.sucio || (!r?.fotos && (leerFotos().logo || leerFotos().trabajos.length))) {
        await subir.current("fotos").catch(() => {});
      }
    };
    void conciliar().catch(() => {});
    const alVolver = () => {
      if (document.visibilityState === "visible") void conciliar().catch(() => {});
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("online", alVolver);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("online", alVolver);
    };
  }, [activo, correo]);

  // Cambios del proyecto, precios o taller hechos aquí
  useEffect(() => {
    if (!activo) return;
    if (primera.current) {
      primera.current = false;
      return;
    }
    if (aplicando.current) {
      aplicando.current = false;
      return;
    }
    programar("estado");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, items, config, precios, cliente, taller, configurado, proyectos, proyectoId]);

  // Cambios del logo o las fotos de trabajos hechos aquí
  useEffect(() => {
    if (!activo) return;
    const alCambiar = (e: Event) => {
      if ((e as CustomEvent).detail === "nube") return;
      programar("fotos");
    };
    window.addEventListener(EVENTO_FOTOS, alCambiar);
    return () => window.removeEventListener(EVENTO_FOTOS, alCambiar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, correo]);

  return null;
}
