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
  clave: ClaveMaterial;
  nombre: string;
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

/** Tableros con veta: los marcados en la configuración y los que el carpintero eligió en madera en el 3D. */
function materialesConVeta(items: ItemProyecto[], cfg: Configuracion) {
  const conVeta = new Set<ClaveMaterial>((Object.keys(cfg.materiales) as ClaveMaterial[]).filter((k) => cfg.materiales[k].veta));
  for (const it of items) {
    const a = it.acabados ?? ACABADOS_DEFECTO;
    if (acabado(a.cuerpo).veta) conVeta.add("cuerpo");
    if (acabado(a.frente).veta) conVeta.add("frente");
  }
  return conVeta;
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
  const conVeta = materialesConVeta(items, cfg);

  items.forEach((item, idx) => {
    const def = buscarMueble(item.muebleId);
    if (!def) return;
    const res = def.generar(item.valores, cfg);
    muebles.push({ item, nombreMueble: def.nombre, resultado: res });
    res.advertencias.forEach((a) => advertencias.push(`${item.nombre}: ${a}`));
    const interior = piezasInterior(res, item.muebleId, item.acabados);
    res.piezas.forEach((pOriginal, j) => {
      const p0: Pieza = esInterior(pOriginal, interior) ? { ...pOriginal, material: "interior" } : pOriginal;
      const veta = conVeta.has(p0.material);
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

  // Optimización por material
  const materiales: ResumenMaterial[] = (Object.keys(cfg.materiales) as ClaveMaterial[]).map((clave) => {
    const m = cfg.materiales[clave];
    const lista: PiezaACortar[] = [];
    let area = 0;
    cortes
      .filter((f) => f.material === clave)
      .forEach((f) => {
        for (let k = 0; k < f.cantidad; k++) lista.push({ ref: f.codigo, nombre: f.pieza, largo: f.largoCorte, ancho: f.anchoCorte });
        area += (f.largoCorte * f.anchoCorte * f.cantidad) / 1e6;
      });
    const { laminas, noCaben } = optimizar(lista, {
      largoLamina: m.largoLamina,
      anchoLamina: m.anchoLamina,
      sierra: cfg.sierra,
      refilado: cfg.refilado,
      permitirRotar: !conVeta.has(clave),
    });
    noCaben.forEach((p) => advertencias.push(`La pieza ${p.ref} (${p.nombre} ${p.largo}×${p.ancho}) no cabe en la lámina de ${m.nombre}.`));
    return { clave, nombre: m.nombre, laminas, noCaben, areaPiezas: area, veta: conVeta.has(clave) };
  });

  // Fusionar materiales iguales (si cuerpo y frente son el mismo tablero, se podrían juntar; se mantienen separados por color)
  const metrosCanto = Math.ceil((mmCanto / 1000) * 1.1 * 10) / 10; // 10 % de desperdicio

  const costos: LineaCotizacion[] = [];
  materiales.forEach((m) => {
    if (!m.laminas.length) return;
    const mat = cfg.materiales[m.clave];
    const u = mat.precioLamina;
    if (precios.cobroLaminas === "proporcional") {
      const areaLamina = (mat.largoLamina * mat.anchoLamina) / 1e6;
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
