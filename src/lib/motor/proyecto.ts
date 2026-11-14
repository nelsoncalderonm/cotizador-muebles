// Cálculo completo de un proyecto: varios muebles → lista de cortes, láminas optimizadas, herrajes y cotización.

import { buscarMueble } from "./catalogo";
import { optimizar, type Lamina, type PiezaACortar } from "./optimizador";
import type { ClaveMaterial, Configuracion, Herraje, Pieza, ResultadoMueble, ValoresParametros } from "./tipos";

export interface ItemProyecto {
  uid: string;
  muebleId: string;
  nombre: string;
  valores: ValoresParametros;
  cantidad: number;
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
}

export interface ResumenMaterial {
  clave: ClaveMaterial;
  nombre: string;
  laminas: Lamina[];
  noCaben: PiezaACortar[];
  areaPiezas: number; // m²
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

export function calcularProyecto(items: ItemProyecto[], cfg: Configuracion, precios: Precios): ResultadoProyecto {
  const muebles: ResultadoProyecto["muebles"] = [];
  const cortes: FilaCorte[] = [];
  const herrajes = new Map<string, Herraje>();
  const advertencias: string[] = [];
  let mmCanto = 0;
  const ec = cfg.espesorCanto;

  items.forEach((item, idx) => {
    const def = buscarMueble(item.muebleId);
    if (!def) return;
    const res = def.generar(item.valores, cfg);
    muebles.push({ item, nombreMueble: def.nombre, resultado: res });
    res.advertencias.forEach((a) => advertencias.push(`${item.nombre}: ${a}`));
    res.piezas.forEach((p, j) => {
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
      permitirRotar: !m.veta,
    });
    noCaben.forEach((p) => advertencias.push(`La pieza ${p.ref} (${p.nombre} ${p.largo}×${p.ancho}) no cabe en la lámina de ${m.nombre}.`));
    return { clave, nombre: m.nombre, laminas, noCaben, areaPiezas: area };
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
  const subtotal = costoTotal + utilidad;
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
    subtotal,
    impuesto,
    total: subtotal + impuesto,
    advertencias,
  };
}
