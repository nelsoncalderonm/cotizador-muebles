// Cálculo completo de un proyecto: varios muebles → lista de cortes, láminas optimizadas, herrajes y cotización.

import { buscarMueble } from "./catalogo";
import { ACABADOS_DEFECTO, acabado, type AcabadosItem } from "../acabados";
import { esInterior, piezasInterior } from "./interior";
import { optimizar, type Lamina, type PiezaACortar } from "./optimizador";
import type { ClaveMaterial, Configuracion, Herraje, Pieza, ResultadoMueble, ValoresParametros } from "./tipos";

export interface ItemProyecto {
  uid: string;
  muebleId: string;
  nombre: string;
  valores: ValoresParametros;
  cantidad: number;
  acabados?: AcabadosItem;
}

export interface Precios {
  simbolo: string;
  decimales: number;
  cantoPorMetro: number;
  servicioCortePorLamina: number;
  canteadoPorMetro: number;
  herrajes: Record<string, number>;
  manoObraPorcentaje: number; // % sobre materiales
  otrosCostos: number; // transporte, instalación…
  margenPorcentaje: number; // utilidad sobre el costo
  impuestoPorcentaje: number;
  cobroLaminas: "completas" | "proporcional"; // proporcional = área usada + desperdicio
  desperdicioPorcentaje: number;
}

export interface FilaCorte {
  codigo: string;
  mueble: string;
  pieza: string;
  material: ClaveMaterial;
  /** Tablero físico del que sale (material + espesor + color), ver ResumenMaterial.id */
  tablero: string;
  largoTerminado: number;
  anchoTerminado: number;
  largoCorte: number;
  anchoCorte: number;
  cantidad: number;
  cantos: Pieza["cantos"];
  nota?: string;
  /** El material tiene veta: el largo va en el sentido de la veta (vertical en el mueble) y la pieza no se rota. */
  veta?: boolean;
}

export interface ResumenMaterial {
  /** Tablero físico: el mismo color y espesor sale de la misma lámina aunque sea cuerpo, frente o interior. */
  id: string;
  clave: ClaveMaterial;
  color: string | null;
  nombre: string;
  espesor: number;
  largoLamina: number;
  anchoLamina: number;
  precioLamina: number;
  laminas: Lamina[];
  noCaben: PiezaACortar[];
  areaPiezas: number; // m²
  /** Tablero con veta (madera): las piezas van con la veta vertical y no se rotan. */
  veta: boolean;
}

/**
 * Qué medida de la pieza queda vertical en el mueble armado (o de adelante hacia atrás si la pieza va acostada),
 * para que en tableros con veta todas las piezas queden con la veta en el mismo sentido: perpendicular al piso.
 */
export function medidaVertical(res: ResultadoMueble, p: Pieza, espesor: number): "largo" | "ancho" | null {
  if (/_(costado|contra)$/.test(p.id)) return "ancho"; // costados y contras de cajón: su alto es el ancho
  const propios = res.vista.rects.filter((x) => x.piezaId === p.id);
  const r = propios.find((x) => x.tipo !== "detalle") ?? propios[0];
  if (!r) return null;
  const cerca = (a: number, b: number) => Math.abs(a - b);
  if (r.h <= espesor * 1.6) {
    // pieza acostada (piso, techo, entrepaño): la veta va de adelante hacia atrás, la medida que no es el ancho del frente
    return cerca(p.largo, r.w) < cerca(p.ancho, r.w) ? "ancho" : "largo";
  }
  return cerca(p.largo, r.h) <= cerca(p.ancho, r.h) ? "largo" : "ancho";
}

/** Color de melamina de una pieza según el mueble: cuerpo y frente toman su acabado; el interior siempre es blanco. */
function colorPieza(clave: ClaveMaterial, item: ItemProyecto) {
  const a = item.acabados ?? ACABADOS_DEFECTO;
  return clave === "interior" ? "blanco" : clave === "frente" ? a.frente : clave === "cuerpo" ? a.cuerpo : null;
}

/** Tablero físico: por espesor, tamaño de lámina y color. El fondo (HDF) es uno solo. */
function idTablero(clave: ClaveMaterial, color: string | null, cfg: Configuracion) {
  const m = cfg.materiales[clave];
  return color === null ? clave : `m${m.espesor}:${m.largoLamina}x${m.anchoLamina}:${color}`;
}

export function nombreColor(color: string) {
  const a = acabado(color);
  return a.nombre === "Otro color" ? `color ${color}` : a.nombre;
}

export interface LineaCotizacion {
  concepto: string;
  detalle: string;
  cantidad: number;
  unitario: number;
  total: number;
}

export interface ResultadoProyecto {
  muebles: { item: ItemProyecto; nombreMueble: string; resultado: ResultadoMueble }[];
  cortes: FilaCorte[];
  materiales: ResumenMaterial[];
  metrosCanto: number;
  herrajes: Herraje[];
  costos: LineaCotizacion[];
  subtotalMateriales: number;
  manoObra: number;
  otrosCostos: number;
  costoTotal: number;
  utilidad: number;
  /** Transporte o envío: se cobra tal cual, sin utilidad encima. */
  transporte: number;
  subtotal: number;
  impuesto: number;
  total: number;
  advertencias: string[];
}

export function precioHerraje(precios: Precios, clave: string) {
  if (clave in precios.herrajes) return precios.herrajes[clave];
  if (clave.startsWith("corredera_")) return precios.herrajes["corredera"] ?? 0;
  return 0;
}

export const textoCantos = (c: Pieza["cantos"]) => {
  const partes: string[] = [];
  const l = (c.largo1 ? 1 : 0) + (c.largo2 ? 1 : 0);
  const a = (c.ancho1 ? 1 : 0) + (c.ancho2 ? 1 : 0);
  if (l) partes.push(`${l} largo${l > 1 ? "s" : ""}`);
  if (a) partes.push(`${a} corto${a > 1 ? "s" : ""}`);
  return partes.length ? partes.join(" + ") : "-";
};

const r1 = (n: number) => Math.round(n * 10) / 10;

export function calcularProyecto(items: ItemProyecto[], cfg: Configuracion, precios: Precios, transporte = 0): ResultadoProyecto {
  const muebles: ResultadoProyecto["muebles"] = [];
  const cortes: FilaCorte[] = [];
  const herrajes = new Map<string, Herraje>();
  const advertencias: string[] = [];
  let mmCanto = 0;
  const ec = cfg.espesorCanto;
  const tableros = new Map<string, { claves: Set<ClaveMaterial>; color: string | null; veta: boolean }>();

  items.forEach((item, idx) => {
    const def = buscarMueble(item.muebleId);
    if (!def) return;
    const res = def.generar(item.valores, cfg);
    muebles.push({ item, nombreMueble: def.nombre, resultado: res });
    res.advertencias.forEach((a) => advertencias.push(`${item.nombre}: ${a}`));
    const interior = piezasInterior(res, item.muebleId, item.acabados);
    res.piezas.forEach((pOriginal, j) => {
      const p0: Pieza = esInterior(pOriginal, interior) ? { ...pOriginal, material: "interior" } : pOriginal;
      const color = colorPieza(p0.material, item);
      const tablero = idTablero(p0.material, color, cfg);
      const veta = cfg.materiales[p0.material].veta || (color !== null && Boolean(acabado(color).veta));
      const tb = tableros.get(tablero) ?? { claves: new Set<ClaveMaterial>(), color, veta: false };
      tb.claves.add(p0.material);
      tb.veta ||= veta;
      tableros.set(tablero, tb);
      // con veta, el largo de corte es la medida vertical: se gira la pieza (y sus cantos) si hace falta
      const girar = veta && medidaVertical(res, p0, cfg.materiales[p0.material].espesor) === "ancho";
      const p = girar
        ? { ...p0, largo: p0.ancho, ancho: p0.largo, cantos: { largo1: p0.cantos.ancho1, largo2: p0.cantos.ancho2, ancho1: p0.cantos.largo1, ancho2: p0.cantos.largo2 } }
        : p0;
      const cant = p.cantidad * item.cantidad;
      const descL = (p.cantos.ancho1 ? ec : 0) + (p.cantos.ancho2 ? ec : 0);
      const descA = (p.cantos.largo1 ? ec : 0) + (p.cantos.largo2 ? ec : 0);
      cortes.push({
        codigo: `${idx + 1}.${String(j + 1).padStart(2, "0")}`,
        mueble: item.nombre,
        pieza: p.nombre,
        material: p.material,
        tablero,
        largoTerminado: p.largo,
        anchoTerminado: p.ancho,
        largoCorte: r1(p.largo - descL),
        anchoCorte: r1(p.ancho - descA),
        cantidad: cant,
        cantos: p.cantos,
        nota: p.nota,
        veta,
      });
      mmCanto += cant * ((p.cantos.largo1 ? p.largo : 0) + (p.cantos.largo2 ? p.largo : 0) + (p.cantos.ancho1 ? p.ancho : 0) + (p.cantos.ancho2 ? p.ancho : 0));
    });
    res.herrajes.forEach((h) => {
      const t = herrajes.get(h.clave);
      if (t) t.cantidad = r1(t.cantidad + h.cantidad * item.cantidad);
      else herrajes.set(h.clave, { ...h, cantidad: r1(h.cantidad * item.cantidad) });
    });
  });

  // Optimización por tablero (color y espesor): piezas del mismo color salen de las mismas láminas
  const orden: ClaveMaterial[] = ["cuerpo", "frente", "interior", "fondo"];
  const materiales: ResumenMaterial[] = [...tableros.entries()]
    .sort(([, a], [, b]) => orden.indexOf([...a.claves][0]) - orden.indexOf([...b.claves][0]))
    .map(([id, tb]) => {
      const claves = [...tb.claves].sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
      const clave = claves[0];
      const base = cfg.materiales[clave];
      const precioBase = Math.max(...claves.map((k) => cfg.materiales[k].precioLamina));
      const nombre =
        tb.color === null
          ? base.nombre
          : tb.color === "blanco"
            ? `Melamina blanca ${base.espesor} mm`
            : `Melamina ${nombreColor(tb.color)} ${base.espesor} mm`;
      const lista: PiezaACortar[] = [];
      let area = 0;
      cortes
        .filter((f) => f.tablero === id)
        .forEach((f) => {
          for (let k = 0; k < f.cantidad; k++) lista.push({ ref: f.codigo, nombre: f.pieza, largo: f.largoCorte, ancho: f.anchoCorte });
          area += (f.largoCorte * f.anchoCorte * f.cantidad) / 1e6;
        });
      const { laminas, noCaben } = optimizar(lista, {
        largoLamina: base.largoLamina,
        anchoLamina: base.anchoLamina,
        sierra: cfg.sierra,
        refilado: cfg.refilado,
        permitirRotar: !tb.veta,
      });
      noCaben.forEach((p) => advertencias.push(`La pieza ${p.ref} (${p.nombre} ${p.largo}×${p.ancho}) no cabe en la lámina de ${nombre}.`));
      return {
        id,
        clave,
        color: tb.color,
        nombre,
        espesor: base.espesor,
        largoLamina: base.largoLamina,
        anchoLamina: base.anchoLamina,
        precioLamina: cfg.preciosTablero?.[id] ?? precioBase,
        laminas,
        noCaben,
        areaPiezas: area,
        veta: tb.veta,
      };
    });

  // Fusionar materiales iguales (si cuerpo y frente son el mismo tablero, se podrían juntar; se mantienen separados por color)
  const metrosCanto = Math.ceil((mmCanto / 1000) * 1.1 * 10) / 10; // 10 % de desperdicio

  const costos: LineaCotizacion[] = [];
  materiales.forEach((m) => {
    if (!m.laminas.length) return;
    const u = m.precioLamina;
    if (precios.cobroLaminas === "proporcional") {
      const areaLamina = (m.largoLamina * m.anchoLamina) / 1e6;
      const cant = Math.min(m.laminas.length, Math.ceil(((m.areaPiezas / areaLamina) * (1 + precios.desperdicioPorcentaje / 100)) * 100) / 100);
      costos.push({ concepto: m.nombre, detalle: `Proporcional al uso (+${precios.desperdicioPorcentaje} % desperdicio)`, cantidad: cant, unitario: u, total: u * cant });
    } else costos.push({ concepto: m.nombre, detalle: "Lámina completa", cantidad: m.laminas.length, unitario: u, total: u * m.laminas.length });
  });
  if (metrosCanto > 0) costos.push({ concepto: "Canto", detalle: `${cfg.espesorCanto} mm, incluye 10 % de desperdicio`, cantidad: metrosCanto, unitario: precios.cantoPorMetro, total: metrosCanto * precios.cantoPorMetro });
  const totalLaminas = materiales.reduce((s, m) => s + m.laminas.length, 0);
  if (precios.servicioCortePorLamina > 0 && totalLaminas > 0)
    costos.push({ concepto: "Servicio de corte", detalle: "Por lámina", cantidad: totalLaminas, unitario: precios.servicioCortePorLamina, total: totalLaminas * precios.servicioCortePorLamina });
  if (precios.canteadoPorMetro > 0 && metrosCanto > 0)
    costos.push({ concepto: "Servicio de canteado", detalle: "Por metro", cantidad: metrosCanto, unitario: precios.canteadoPorMetro, total: metrosCanto * precios.canteadoPorMetro });
  [...herrajes.values()].forEach((h) => {
    const u = precioHerraje(precios, h.clave);
    costos.push({ concepto: h.nombre, detalle: "Herraje", cantidad: h.cantidad, unitario: u, total: u * h.cantidad });
  });

  const subtotalMateriales = costos.reduce((s, c) => s + c.total, 0);
  const manoObra = (subtotalMateriales * precios.manoObraPorcentaje) / 100;
  const otrosCostos = precios.otrosCostos;
  const costoTotal = subtotalMateriales + manoObra + otrosCostos;
  const utilidad = (costoTotal * precios.margenPorcentaje) / 100;
  const flete = items.length ? Math.max(0, transporte || 0) : 0;
  const subtotal = costoTotal + utilidad + flete;
  const impuesto = (subtotal * precios.impuestoPorcentaje) / 100;

  return {
    muebles,
    cortes,
    materiales,
    metrosCanto,
    herrajes: [...herrajes.values()],
    costos,
    subtotalMateriales,
    manoObra,
    otrosCostos,
    costoTotal,
    utilidad,
    transporte: flete,
    subtotal,
    impuesto,
    total: subtotal + impuesto,
    advertencias,
  };
}
