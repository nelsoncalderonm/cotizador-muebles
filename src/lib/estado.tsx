"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { buscarMueble, valoresPorDefecto } from "./motor/catalogo";
import { CONFIG_DEFECTO, PRECIOS_DEFECTO } from "./motor/defaults";
import { calcularProyecto, type ItemProyecto, type Precios, type ResultadoProyecto } from "./motor/proyecto";
import type { Configuracion } from "./motor/tipos";

export interface DatosCliente {
  proyecto: string;
  cliente: string;
  telefono: string;
  notas: string;
  validezDias: number;
}

export interface DatosTaller {
  nombre: string;
  telefono: string;
  ciudad: string;
  /** País elegido en la configuración inicial (id de PAISES). */
  pais?: string;
}

interface Guardado {
  items: ItemProyecto[];
  config: Configuracion;
  precios: Precios;
  cliente: DatosCliente;
  taller: DatosTaller;
  /** La configuración inicial ya se hizo (o se saltó). */
  configurado: boolean;
}

const CLAVE = "cotizador-muebles:v1";

const INICIAL: Guardado = {
  items: [],
  config: CONFIG_DEFECTO,
  precios: PRECIOS_DEFECTO,
  cliente: { proyecto: "", cliente: "", telefono: "", notas: "", validezDias: 15 },
  taller: { nombre: "", telefono: "", ciudad: "" },
  configurado: false,
};

function cargar(): Guardado {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return INICIAL;
    const g = JSON.parse(raw) as Partial<Guardado>;
    return {
      items: g.items ?? [],
      config: { ...CONFIG_DEFECTO, ...g.config, materiales: { ...CONFIG_DEFECTO.materiales, ...g.config?.materiales } },
      precios: { ...PRECIOS_DEFECTO, ...g.precios, herrajes: { ...PRECIOS_DEFECTO.herrajes, ...g.precios?.herrajes } },
      cliente: { ...INICIAL.cliente, ...g.cliente },
      taller: { ...INICIAL.taller, ...g.taller },
      // quien ya venía usando la app (tiene muebles o datos del taller) no ve la configuración inicial
      configurado: g.configurado ?? Boolean(g.items?.length || g.taller?.nombre),
    };
  } catch {
    return INICIAL;
  }
}

const uid = () => Math.random().toString(36).slice(2, 10);

interface Ctx extends Guardado {
  listo: boolean;
  resultado: ResultadoProyecto;
  seleccion: string | null;
  seleccionar: (uid: string | null) => void;
  agregar: (muebleId: string, valores?: ItemProyecto["valores"], cantidad?: number) => void;
  actualizarItem: (uid: string, cambios: Partial<ItemProyecto>) => void;
  duplicar: (uid: string) => void;
  eliminar: (uid: string) => void;
  setConfig: (c: Configuracion) => void;
  setPrecios: (p: Precios) => void;
  setCliente: (c: DatosCliente) => void;
  setTaller: (t: DatosTaller) => void;
  nuevoProyecto: () => void;
  /** Guarda de una vez lo elegido en la configuración inicial. Sin cambios = solo la marca como hecha. */
  terminarConfiguracion: (cambios?: { config: Configuracion; precios: Precios; taller: DatosTaller }) => void;
  repetirConfiguracion: () => void;
}

const Contexto = createContext<Ctx | null>(null);

export function ProveedorEstado({ children }: { children: ReactNode }) {
  const [g, setG] = useState<Guardado>(INICIAL);
  const [listo, setListo] = useState(false);
  const [seleccion, setSeleccion] = useState<string | null>(null);

  useEffect(() => {
    const c = cargar();
    setG(c);
    setSeleccion(c.items[0]?.uid ?? null);
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(g));
    } catch {
      /* sin almacenamiento */
    }
  }, [g, listo]);

  const resultado = useMemo(() => calcularProyecto(g.items, g.config, g.precios), [g.items, g.config, g.precios]);

  const agregar = useCallback((muebleId: string, valores?: ItemProyecto["valores"], cantidad?: number) => {
    const def = buscarMueble(muebleId);
    if (!def) return;
    const nuevo: ItemProyecto = { uid: uid(), muebleId, nombre: def.nombre, valores: { ...valoresPorDefecto(def), ...valores }, cantidad: cantidad ?? 1 };
    setG((s) => {
      const iguales = s.items.filter((i) => i.muebleId === muebleId).length;
      if (iguales > 0) nuevo.nombre = `${def.nombre} ${iguales + 1}`;
      return { ...s, items: [...s.items, nuevo] };
    });
    setSeleccion(nuevo.uid);
  }, []);

  const actualizarItem = useCallback((id: string, cambios: Partial<ItemProyecto>) => {
    setG((s) => ({ ...s, items: s.items.map((i) => (i.uid === id ? { ...i, ...cambios } : i)) }));
  }, []);

  const duplicar = useCallback((id: string) => {
    const nuevoId = uid();
    setG((s) => {
      const idx = s.items.findIndex((i) => i.uid === id);
      if (idx < 0) return s;
      const copia = { ...s.items[idx], uid: nuevoId, nombre: `${s.items[idx].nombre} (copia)`, valores: { ...s.items[idx].valores } };
      const items = [...s.items];
      items.splice(idx + 1, 0, copia);
      return { ...s, items };
    });
    setSeleccion(nuevoId);
  }, []);

  const eliminar = useCallback((id: string) => {
    setG((s) => {
      const items = s.items.filter((i) => i.uid !== id);
      setSeleccion(items[0]?.uid ?? null);
      return { ...s, items };
    });
  }, []);

  const valor: Ctx = {
    ...g,
    listo,
    resultado,
    seleccion,
    seleccionar: setSeleccion,
    agregar,
    actualizarItem,
    duplicar,
    eliminar,
    setConfig: (config) => setG((s) => ({ ...s, config })),
    setPrecios: (precios) => setG((s) => ({ ...s, precios })),
    setCliente: (cliente) => setG((s) => ({ ...s, cliente })),
    setTaller: (taller) => setG((s) => ({ ...s, taller })),
    terminarConfiguracion: (cambios) => setG((s) => ({ ...s, ...cambios, configurado: true })),
    repetirConfiguracion: () => setG((s) => ({ ...s, configurado: false })),
    nuevoProyecto: () => {
      setG((s) => ({ ...s, items: [], cliente: INICIAL.cliente }));
      setSeleccion(null);
    },
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEstado() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useEstado fuera del proveedor");
  return c;
}

export function formatoDinero(n: number, p: Pick<Precios, "simbolo" | "decimales">) {
  return `${p.simbolo}${new Intl.NumberFormat("es-CO", { minimumFractionDigits: p.decimales, maximumFractionDigits: p.decimales }).format(n)}`;
}

export const mm = (n: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(n);
