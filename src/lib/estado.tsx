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
  /** Porcentaje de anticipo que se pide para empezar (0 = no se muestra). */
  anticipoPorcentaje: number;
  /** Días hábiles de fabricación e instalación (0 = no se muestra). */
  entregaDias: number;
  /** Mensaje de WhatsApp escrito a mano; vacío = se arma solo. */
  mensaje: string;
  /** Transporte o envío que se suma a esta cotización (0 = no se cobra aparte). */
  transporte: number;
}

export interface DatosTaller {
  nombre: string;
  telefono: string;
  ciudad: string;
  /** País elegido en la configuración inicial (id de PAISES). */
  pais?: string;
  /** WhatsApp del proveedor de tableros, para pedirle cotización. */
  proveedor?: string;
}

/** Un trabajo guardado: sus muebles y los datos del cliente y de la cotización. */
export interface Proyecto {
  id: string;
  items: ItemProyecto[];
  cliente: DatosCliente;
  creado: string;
  actualizado: string;
}

export interface Guardado {
  /** Proyecto abierto: sus muebles y su cliente viven en items y cliente. */
  proyectoId: string;
  /** Todos los proyectos guardados (el abierto puede estar desactualizado aquí: manda items/cliente). */
  proyectos: Proyecto[];
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
  proyectoId: "",
  proyectos: [],
  items: [],
  config: CONFIG_DEFECTO,
  precios: PRECIOS_DEFECTO,
  cliente: { proyecto: "", cliente: "", telefono: "", notas: "", validezDias: 15, anticipoPorcentaje: 50, entregaDias: 0, mensaje: "", transporte: 0 },
  taller: { nombre: "", telefono: "", ciudad: "" },
  configurado: false,
};

function cargar(): Guardado {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return INICIAL;
    return normalizar(JSON.parse(raw) as Partial<Guardado>);
  } catch {
    return INICIAL;
  }
}

/** Completa con los valores por defecto lo que falte (datos viejos o de otra versión). */
/** Quien ya tenía sus tableros configurados recibe la melamina blanca de interior con su misma lámina y espesor, ~15 % más barata que la del cuerpo. */
function conInterior(m: Configuracion["materiales"], guardados?: Partial<Configuracion["materiales"]>): Configuracion["materiales"] {
  if (guardados?.interior || !guardados?.cuerpo) return m;
  const c = m.cuerpo;
  return { ...m, interior: { ...m.interior, espesor: c.espesor, largoLamina: c.largoLamina, anchoLamina: c.anchoLamina, precioLamina: Math.round(c.precioLamina * 85) / 100 } };
}

export function normalizar(g: Partial<Guardado>): Guardado {
  try {
    const cliente = { ...INICIAL.cliente, ...g.cliente };
    return {
      proyectoId: g.proyectoId || nuevoId(),
      proyectos: (g.proyectos ?? []).map((p) => ({ ...p, items: p.items ?? [], cliente: { ...INICIAL.cliente, ...p.cliente } })),
      items: g.items ?? [],
      config: { ...CONFIG_DEFECTO, ...g.config, materiales: conInterior({ ...CONFIG_DEFECTO.materiales, ...g.config?.materiales }, g.config?.materiales) },
      precios: { ...PRECIOS_DEFECTO, ...g.precios, herrajes: { ...PRECIOS_DEFECTO.herrajes, ...g.precios?.herrajes } },
      cliente,
      taller: { ...INICIAL.taller, ...g.taller },
      // quien ya venía usando la app (tiene muebles o datos del taller) no ve la configuración inicial
      configurado: g.configurado ?? Boolean(g.items?.length || g.taller?.nombre),
    };
  } catch {
    return INICIAL;
  }
}

const uid = () => Math.random().toString(36).slice(2, 10);
const nuevoId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const ahora = () => new Date().toISOString();

/** Lista de proyectos con el abierto al día (lo que se ve en "Proyectos"). */
export function proyectosAlDia(g: Pick<Guardado, "proyectoId" | "proyectos" | "items" | "cliente">): Proyecto[] {
  const previo = g.proyectos.find((p) => p.id === g.proyectoId);
  const abierto: Proyecto = { id: g.proyectoId, items: g.items, cliente: g.cliente, creado: previo?.creado ?? ahora(), actualizado: previo?.actualizado ?? ahora() };
  const vacio = !g.items.length && !g.cliente.cliente.trim() && !g.cliente.proyecto.trim();
  const otros = g.proyectos.filter((p) => p.id !== g.proyectoId);
  return vacio && !previo ? otros : [abierto, ...otros];
}

/** Guarda el proyecto abierto dentro de la lista antes de cambiar a otro. */
function guardarAbierto(s: Guardado): Proyecto[] {
  const previo = s.proyectos.find((p) => p.id === s.proyectoId);
  const vacio = !s.items.length && !s.cliente.cliente.trim() && !s.cliente.proyecto.trim();
  const otros = s.proyectos.filter((p) => p.id !== s.proyectoId);
  if (vacio) return otros;
  const cambio = !previo || previo.items !== s.items || previo.cliente !== s.cliente;
  return [{ id: s.proyectoId, items: s.items, cliente: s.cliente, creado: previo?.creado ?? ahora(), actualizado: cambio ? ahora() : previo!.actualizado }, ...otros];
}

interface Ctx extends Guardado {
  listo: boolean;
  resultado: ResultadoProyecto;
  seleccion: string | null;
  seleccionar: (uid: string | null) => void;
  agregar: (muebleId: string, valores?: ItemProyecto["valores"], cantidad?: number, extra?: Pick<ItemProyecto, "acabados">) => void;
  actualizarItem: (uid: string, cambios: Partial<ItemProyecto>) => void;
  duplicar: (uid: string) => void;
  eliminar: (uid: string) => void;
  setConfig: (c: Configuracion) => void;
  setPrecios: (p: Precios) => void;
  setCliente: (c: DatosCliente) => void;
  setTaller: (t: DatosTaller) => void;
  /** Guarda el proyecto abierto y empieza uno nuevo (opcionalmente con muebles y cliente). */
  nuevoProyecto: (datos?: { items?: ItemProyecto[]; cliente?: Partial<DatosCliente> }) => void;
  abrirProyecto: (id: string) => void;
  borrarProyecto: (id: string) => void;
  duplicarProyecto: (id: string) => void;
  /** Guarda de una vez lo elegido en la configuración inicial. Sin cambios = solo la marca como hecha. */
  terminarConfiguracion: (cambios?: { config: Configuracion; precios: Precios; taller: DatosTaller }) => void;
  repetirConfiguracion: () => void;
  /** Reemplaza todo con lo guardado en la nube o con una cotización vieja. */
  reemplazar: (g: Partial<Guardado>) => void;
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

  const resultado = useMemo(() => calcularProyecto(g.items, g.config, g.precios, g.cliente.transporte), [g.items, g.config, g.precios, g.cliente.transporte]);

  const agregar = useCallback((muebleId: string, valores?: ItemProyecto["valores"], cantidad?: number, extra?: Pick<ItemProyecto, "acabados">) => {
    const def = buscarMueble(muebleId);
    if (!def) return;
    const nuevo: ItemProyecto = { uid: uid(), muebleId, nombre: def.nombre, valores: { ...valoresPorDefecto(def), ...valores }, cantidad: cantidad ?? 1, ...extra };
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
    reemplazar: (nuevo) => {
      const n = normalizar({ ...g, ...nuevo });
      setG(n);
      setSeleccion(n.items[0]?.uid ?? null);
    },
    nuevoProyecto: (datos) => {
      const items = (datos?.items ?? []).map((i) => ({ ...i, uid: uid() }));
      setG((s) => ({ ...s, proyectos: guardarAbierto(s), proyectoId: nuevoId(), items, cliente: { ...INICIAL.cliente, ...datos?.cliente } }));
      setSeleccion(items[0]?.uid ?? null);
    },
    abrirProyecto: (id) => {
      const destino = g.proyectos.find((p) => p.id === id);
      if (!destino || id === g.proyectoId) return;
      setG((s) => ({ ...s, proyectos: guardarAbierto(s), proyectoId: id, items: destino.items, cliente: { ...INICIAL.cliente, ...destino.cliente } }));
      setSeleccion(destino.items[0]?.uid ?? null);
    },
    borrarProyecto: (id) => {
      setG((s) => {
        if (id !== s.proyectoId) return { ...s, proyectos: s.proyectos.filter((p) => p.id !== id) };
        const resto = s.proyectos.filter((p) => p.id !== id);
        const sig = resto[0];
        return sig
          ? { ...s, proyectos: resto, proyectoId: sig.id, items: sig.items, cliente: { ...INICIAL.cliente, ...sig.cliente } }
          : { ...s, proyectos: resto, proyectoId: nuevoId(), items: [], cliente: INICIAL.cliente };
      });
      setSeleccion(null);
    },
    duplicarProyecto: (id) => {
      const lista = proyectosAlDia(g);
      const origen = lista.find((p) => p.id === id);
      if (!origen) return;
      const items = origen.items.map((i) => ({ ...i, uid: uid(), valores: { ...i.valores } }));
      const cliente = { ...origen.cliente, proyecto: `${origen.cliente.proyecto || "Proyecto"} (copia)`, mensaje: "" };
      setG((s) => ({ ...s, proyectos: guardarAbierto(s), proyectoId: nuevoId(), items, cliente }));
      setSeleccion(items[0]?.uid ?? null);
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
