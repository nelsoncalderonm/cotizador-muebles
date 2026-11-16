"use client";
// Cotizaciones enviadas por link: historial, estado (enviada, aprobada, perdida) y aviso cuando el cliente la abre.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useCuenta } from "./cuenta";
import type { DatosCliente, Guardado } from "./estado";
import { cuentasActivas, supabase } from "./supabase";

export type EstadoCot = "enviada" | "aprobada" | "perdida";

export interface Cotizacion {
  id: string;
  numero: string | null;
  cliente: string | null;
  telefono: string | null;
  proyecto: string | null;
  total: number;
  anticipo: number;
  moneda: { simbolo: string; decimales: number } | null;
  estado: EstadoCot;
  datos: { items: Guardado["items"]; cliente: DatosCliente } | null;
  creada: string;
  estado_cambiado: string | null;
  vistas: number;
  vista_primera: string | null;
  vista_ultima: string | null;
}

export interface NuevaCotizacion {
  id: string;
  numero: string;
  cliente: string;
  telefono: string;
  proyecto: string;
  total: number;
  anticipo: number;
  moneda: { simbolo: string; decimales: number };
  datos: { items: Guardado["items"]; cliente: DatosCliente };
}

interface Ctx {
  activas: boolean;
  lista: Cotizacion[];
  cargando: boolean;
  /** Cotizaciones que el cliente abrió desde la última vez que el carpintero miró el historial. */
  nuevasVistas: Cotizacion[];
  recargar: () => Promise<void>;
  registrar: (c: NuevaCotizacion) => Promise<void>;
  cambiarEstado: (id: string, estado: EstadoCot) => Promise<void>;
  borrar: (id: string) => Promise<void>;
  marcarVistas: () => void;
}

const Contexto = createContext<Ctx | null>(null);
const CLAVE_VISTAS = "inner-muebles:vistas-conocidas";

function vistasConocidas(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_VISTAS) || "{}");
  } catch {
    return {};
  }
}

export function ProveedorCotizaciones({ children }: { children: ReactNode }) {
  const { correo } = useCuenta();
  const activas = cuentasActivas && Boolean(correo);
  const [lista, setLista] = useState<Cotizacion[]>([]);
  const [cargando, setCargando] = useState(activas);
  const [conocidas, setConocidas] = useState<Record<string, number>>({});
  const primeraCarga = useRef(true);

  const recargar = useCallback(async () => {
    if (!activas) return;
    const { data, error } = await supabase().rpc("im_mis_cotizaciones");
    setCargando(false);
    if (error || !Array.isArray(data)) return;
    const filas = (data as Cotizacion[]).map((c) => ({ ...c, total: Number(c.total), anticipo: Number(c.anticipo) }));
    setLista(filas);
    const prev = vistasConocidas();
    // la primera vez en este dispositivo no se avisa de vistas viejas
    if (primeraCarga.current && !localStorage.getItem(CLAVE_VISTAS)) {
      const todas = Object.fromEntries(filas.map((c) => [c.id, c.vistas]));
      localStorage.setItem(CLAVE_VISTAS, JSON.stringify(todas));
      setConocidas(todas);
    } else setConocidas(prev);
    primeraCarga.current = false;
  }, [activas]);

  // Al entrar, cada minuto con la app abierta y al volver a ella
  useEffect(() => {
    if (!activas) return;
    void recargar();
    const reloj = setInterval(() => {
      if (document.visibilityState === "visible") void recargar();
    }, 60_000);
    const alVolver = () => {
      if (document.visibilityState === "visible") void recargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(reloj);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [activas, recargar]);

  const registrar = useCallback(
    async (c: NuevaCotizacion) => {
      const { error } = await supabase().rpc("im_registrar_cotizacion", {
        p_id: c.id,
        p_numero: c.numero,
        p_cliente: c.cliente,
        p_telefono: c.telefono,
        p_proyecto: c.proyecto,
        p_total: c.total,
        p_anticipo: c.anticipo,
        p_moneda: c.moneda,
        p_datos: c.datos,
      });
      if (error) throw error;
      const k = vistasConocidas();
      k[c.id] = 0;
      localStorage.setItem(CLAVE_VISTAS, JSON.stringify(k));
      void recargar();
    },
    [recargar],
  );

  const cambiarEstado = useCallback(async (id: string, estado: EstadoCot) => {
    setLista((l) => l.map((c) => (c.id === id ? { ...c, estado, estado_cambiado: new Date().toISOString() } : c)));
    const { error } = await supabase().rpc("im_estado_cotizacion", { p_id: id, p_estado: estado });
    if (error) void recargar();
  }, [recargar]);

  const borrar = useCallback(async (id: string) => {
    setLista((l) => l.filter((c) => c.id !== id));
    const { error } = await supabase().rpc("im_borrar_cotizacion", { p_id: id });
    if (error) void recargar();
  }, [recargar]);

  const marcarVistas = useCallback(() => {
    const todas = Object.fromEntries(lista.map((c) => [c.id, c.vistas]));
    try {
      localStorage.setItem(CLAVE_VISTAS, JSON.stringify(todas));
    } catch {
      /* nada */
    }
    setConocidas(todas);
  }, [lista]);

  const nuevasVistas = lista.filter((c) => c.vistas > (conocidas[c.id] ?? 0));

  return (
    <Contexto.Provider value={{ activas, lista, cargando, nuevasVistas, recargar, registrar, cambiarEstado, borrar, marcarVistas }}>
      {children}
    </Contexto.Provider>
  );
}

export function useCotizaciones() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useCotizaciones fuera del proveedor");
  return c;
}

/** "hace 5 min", "hace 2 h", "ayer", "12 nov". */
export function hace(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 90) return "hace un momento";
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  if (s < 172800) return "ayer";
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}
