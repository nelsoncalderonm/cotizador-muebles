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

export interface Cliente {
  clave: string;
  nombre: string | null;
  telefono: string | null;
  nota: string | null;
  /** Fecha (AAAA-MM-DD) en que toca volver a escribirle. */
  proximo: string | null;
  ultimo_contacto: string | null;
  creado: string;
}

export interface CambioCliente {
  nombre?: string;
  telefono?: string;
  nota?: string;
  proximo?: string | null;
  contactado?: boolean;
}

/** Clave de un cliente: su WhatsApp (solo números) o, si no tiene, su nombre. */
export const claveCliente = (telefono?: string | null, nombre?: string | null) => {
  const t = (telefono || "").replace(/\D/g, "");
  if (t) return t;
  const n = (nombre || "").trim().toLowerCase();
  return n ? `n:${n}` : "";
};

/** Hoy en el reloj del celular, como AAAA-MM-DD. */
export function hoyISO(dias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Ctx {
  activas: boolean;
  clientes: Cliente[];
  /** Clientes a los que hoy (o antes) tocaba escribirles. */
  pendientesHoy: number;
  guardarCliente: (clave: string, cambio: CambioCliente) => Promise<void>;
  borrarCliente: (clave: string) => Promise<void>;
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
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const primeraCarga = useRef(true);

  const recargar = useCallback(async () => {
    if (!activas) return;
    const [{ data, error }, cli] = await Promise.all([supabase().rpc("im_mis_cotizaciones"), supabase().rpc("im_mis_clientes")]);
    setCargando(false);
    if (!cli.error && Array.isArray(cli.data)) setClientes(cli.data as Cliente[]);
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

  const guardarCliente = useCallback(
    async (clave: string, c: CambioCliente) => {
      setClientes((l) => {
        const actual = l.find((x) => x.clave === clave);
        const base: Cliente = actual ?? { clave, nombre: null, telefono: null, nota: null, proximo: null, ultimo_contacto: null, creado: new Date().toISOString() };
        const nuevo: Cliente = {
          ...base,
          nombre: c.nombre ?? base.nombre,
          telefono: c.telefono ?? base.telefono,
          nota: c.nota ?? base.nota,
          proximo: c.proximo === undefined ? base.proximo : c.proximo,
          ultimo_contacto: c.contactado ? new Date().toISOString() : base.ultimo_contacto,
        };
        return actual ? l.map((x) => (x.clave === clave ? nuevo : x)) : [...l, nuevo];
      });
      const { error } = await supabase().rpc("im_guardar_cliente", {
        p_clave: clave,
        p_nombre: c.nombre ?? null,
        p_telefono: c.telefono ?? null,
        p_nota: c.nota ?? null,
        p_proximo: c.proximo ?? null,
        p_limpiar_proximo: c.proximo === null,
        p_contactado: Boolean(c.contactado),
      });
      if (error) void recargar();
    },
    [recargar],
  );

  const borrarCliente = useCallback(
    async (clave: string) => {
      setClientes((l) => l.filter((x) => x.clave !== clave));
      const { error } = await supabase().rpc("im_borrar_cliente", { p_clave: clave });
      if (error) void recargar();
    },
    [recargar],
  );

  const hoy = hoyISO();
  const pendientesHoy = clientes.filter((c) => c.proximo && c.proximo <= hoy).length;

  const nuevasVistas = lista.filter((c) => c.vistas > (conocidas[c.id] ?? 0));

  return (
    <Contexto.Provider value={{ activas, clientes, pendientesHoy, guardarCliente, borrarCliente, lista, cargando, nuevasVistas, recargar, registrar, cambiarEstado, borrar, marcarVistas }}>
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
