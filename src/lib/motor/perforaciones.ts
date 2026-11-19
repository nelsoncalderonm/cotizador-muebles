// Perforaciones de cada pieza para el operario: tarugos, cazoletas de bisagra, bases, soportes de entrepaño,
// correderas y jaladeras. Se calculan a partir de la vista de frente del mueble (dónde se toca cada pieza con otra).
// Medidas en mm. Sistema de 32 mm: las líneas de perforación van a 37 mm del borde frontal.

import { bisagrasPorPuerta, esPuerta } from "./constructor";
import type { Configuracion, Pieza, RectVista, ResultadoMueble } from "./tipos";

export type TipoPerf = "tarugo_cara" | "tarugo_canto" | "cazoleta" | "base_bisagra" | "soporte" | "corredera" | "jaladera" | "pata";

export const HERRAMIENTAS: Record<TipoPerf, { nombre: string; herramienta: string; diametro: number; profundidad: string; color: string }> = {
  tarugo_cara: { nombre: "Tarugo 8×35 (en la cara)", herramienta: "Broca de 8 mm con tope", diametro: 8, profundidad: "12 mm", color: "#c2410c" },
  tarugo_canto: { nombre: "Tarugo 8×35 (en el canto)", herramienta: "Broca de 8 mm con tope, centrada en el canto", diametro: 8, profundidad: "25 mm", color: "#ea580c" },
  cazoleta: { nombre: "Cazoleta de bisagra", herramienta: "Fresa Forstner (sacabocados) de 35 mm", diametro: 35, profundidad: "12,5 mm", color: "#1d4ed8" },
  base_bisagra: { nombre: "Base de bisagra", herramienta: "Broca de 3 mm (guía para tornillo 4×16)", diametro: 3, profundidad: "10 mm", color: "#2563eb" },
  soporte: { nombre: "Soporte de entrepaño (pin)", herramienta: "Broca de 5 mm con tope", diametro: 5, profundidad: "10 mm", color: "#15803d" },
  corredera: { nombre: "Corredera telescópica", herramienta: "Broca de 3 mm (guía para tornillo 4×16)", diametro: 3, profundidad: "10 mm", color: "#7c3aed" },
  jaladera: { nombre: "Jaladera (128 mm entre centros)", herramienta: "Broca de 5 mm", diametro: 5, profundidad: "pasante (atraviesa la pieza)", color: "#0f766e" },
  pata: { nombre: "Pata niveladora", herramienta: "Broca de 3 mm", diametro: 3, profundidad: "10 mm", color: "#6b7280" },
};

export interface Perforacion {
  x: number;
  y: number;
  tipo: TipoPerf;
  /** Para tarugos en el canto: en qué canto va (el dibujo los marca en ese borde). */
  canto?: "izq" | "der" | "abajo" | "arriba" | "atras";
}

export interface PlanoPieza {
  clave: string;
  piezaId: string;
  titulo: string;
  /** Cuántas piezas iguales llevan este mismo plano. */
  veces: number;
  ancho: number;
  alto: number;
  /** Qué representa cada eje del dibujo, para que el operario oriente la pieza. */
  ejeX: string;
  ejeY: string;
  perforaciones: Perforacion[];
  notas: string[];
}

/** Línea de 37 mm desde el frente y desde atrás, más intermedias cada ~250 mm en piezas hondas. */
function lineasFondo(D: number) {
  if (D < 120) return [D / 2];
  const ini = 37, fin = D - 37;
  const n = Math.max(0, Math.floor((fin - ini) / 250));
  return Array.from({ length: n + 2 }, (_, i) => Math.round(ini + ((fin - ini) * i) / (n + 1)));
}

const JALADERA_ENTRE = 128;

export function perforaciones(res: ResultadoMueble, cfg: Configuracion, fondoMueble: number): PlanoPieza[] {
  const e = cfg.materiales.cuerpo.espesor;
  const rects = res.vista.rects;
  const pieza = (id: string) => res.piezas.find((p) => p.id === id);
  const estructura = rects.filter((r) => r.tipo === "estructura" || (r.tipo === "detalle" && r.piezaId === "faldon"));
  const esVertical = (r: RectVista) => r.w <= e * 1.6 && r.h > e * 3;
  const esAcostada = (r: RectVista) => r.h <= e * 1.6 && r.w > e * 3;
  const verticales = estructura.filter(esVertical);
  const otraMedida = (p: Pieza | undefined, conocida: number, defecto: number) =>
    !p ? defecto : Math.abs(p.largo - conocida) < Math.abs(p.ancho - conocida) ? p.ancho : p.largo;
  const hondo = (r: RectVista) => otraMedida(pieza(r.piezaId), esVertical(r) ? r.h : r.w, fondoMueble);
  const solapa = (a: RectVista, y: number) => y >= a.y - 1 && y <= a.y + a.h + 1;

  // Un plano por cada vertical y cara; las demás piezas, un plano por id
  type Cara = "izq" | "der";
  const planosV = new Map<string, { r: RectVista; cara: Cara; perfs: Perforacion[]; notas: Set<string> }>();
  const planoV = (r: RectVista, cara: Cara) => {
    const k = `${rects.indexOf(r)}:${cara}`;
    if (!planosV.has(k)) planosV.set(k, { r, cara, perfs: [], notas: new Set() });
    return planosV.get(k)!;
  };
  const planosP = new Map<string, { r: RectVista; perfs: Perforacion[]; notas: Set<string>; ancho: number; alto: number; ejeX: string; ejeY: string; titulo: string; veces: number }>();
  const planoP = (r: RectVista, ancho: number, alto: number, ejeX: string, ejeY: string, titulo?: string, clave = r.piezaId) => {
    if (!planosP.has(clave))
      planosP.set(clave, { r, perfs: [], notas: new Set(), ancho, alto, ejeX, ejeY, titulo: titulo ?? pieza(r.piezaId)?.nombre ?? r.piezaId, veces: 0 });
    return planosP.get(clave)!;
  };
  const yaEsta = (lista: Perforacion[], p: Perforacion) => lista.some((q) => q.tipo === p.tipo && Math.abs(q.x - p.x) < 1 && Math.abs(q.y - p.y) < 1 && q.canto === p.canto);
  const poner = (lista: Perforacion[], p: Perforacion) => {
    if (!yaEsta(lista, p)) lista.push({ ...p, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 });
  };

  // 1. Tarugos: piezas acostadas y zócalos que llegan a la cara de una vertical
  for (const h of estructura) {
    if (esVertical(h)) continue;
    const acostada = esAcostada(h);
    const movil = h.piezaId.startsWith("entrepano") && h.piezaId !== "entrepano_fijo";
    for (const v of verticales) {
      const toca: Cara | null = Math.abs(h.x - (v.x + v.w)) < 1.5 ? "der" : Math.abs(h.x + h.w - v.x) < 1.5 ? "izq" : null;
      if (!toca || !solapa(v, h.y + h.h / 2)) continue;
      const Dv = hondo(v);
      const yV = h.y + h.h / 2 - v.y;
      const pv = planoV(v, toca);
      if (movil) {
        // entrepaño que se puede mover: 2 pines por lado, debajo del entrepaño
        const Dh = hondo(h);
        for (const z of [50, Math.min(Dv, Dh + (Dv - Dh)) - 50]) poner(pv.perfs, { x: z, y: h.y - v.y - 8, tipo: "soporte" });
        pv.notas.add("Si el cliente quiere mover los entrepaños, haz una fila de agujeros de 5 mm cada 32 mm sobre las mismas líneas.");
        continue;
      }
      if (acostada) {
        const Dh = h.piezaId === "travesano" ? 100 : hondo(h);
        const atras = Dv - Dh; // las piezas más cortas van a ras de atrás (contra el fondo)
        const zs = h.piezaId === "travesano" ? [25, 75, Dv - 75, Dv - 25] : lineasFondo(Dh).map((z) => z + atras);
        zs.forEach((z) => poner(pv.perfs, { x: z, y: yV, tipo: "tarugo_cara" }));
        const ph = planoP(h, h.w, Dh, "largo de la pieza (de izquierda a derecha)", "desde el borde frontal (con canto)");
        const zh = h.piezaId === "travesano" ? [25, 75] : lineasFondo(Dh);
        zh.forEach((z) => poner(ph.perfs, { x: toca === "der" ? 0 : h.w, y: z, tipo: "tarugo_canto", canto: toca === "der" ? "izq" : "der" }));
        if (h.piezaId === "travesano") ph.notas.add("Son 2 travesaños de 100 mm: uno al frente y otro atrás. Cada uno lleva 2 tarugos por punta.");
      } else {
        // zócalo o faldón: tabla de canto entre laterales
        const Dpos = h.piezaId === "faldon" ? Dv - 30 - e / 2 : h.piezaId.startsWith("zocalo") ? 40 + e / 2 : Dv / 2;
        const ys = h.h >= 90 ? [h.h * 0.25, h.h * 0.75] : [h.h / 2];
        ys.forEach((yy) => poner(pv.perfs, { x: Dpos, y: h.y + yy - v.y, tipo: "tarugo_cara" }));
        const ph = planoP(h, h.w, h.h, "largo de la pieza", "alto de la pieza");
        ys.forEach((yy) => poner(ph.perfs, { x: toca === "der" ? 0 : h.w, y: yy, tipo: "tarugo_canto", canto: toca === "der" ? "izq" : "der" }));
      }
    }
    // verticales que se apoyan sobre esta pieza (divisiones sobre el piso) o que la sostienen (cubierta sobre sus patas)
    if (acostada && !movil) {
      for (const v of verticales) {
        if (v.x + v.w <= h.x + 0.5 || v.x >= h.x + h.w - 0.5) continue;
        const encima = Math.abs(h.y - (v.y + v.h)) < 1.5; // la pieza va encima de la vertical
        const debajo = Math.abs(v.y - (h.y + h.h)) < 1.5; // la vertical se apoya sobre la pieza
        if (!encima && !debajo) continue;
        const Dv = hondo(v);
        const Dh = hondo(h);
        const ph = planoP(h, h.w, Dh, "largo de la pieza (de izquierda a derecha)", "desde el borde frontal (con canto)");
        const zs = lineasFondo(Math.min(Dv, Dh));
        zs.forEach((z) => poner(ph.perfs, { x: v.x + v.w / 2 - h.x, y: z, tipo: "tarugo_cara" }));
        ph.notas.add(encima ? "Los tarugos de la cara van por debajo de la pieza, sobre el centro de cada vertical." : "Los tarugos de la cara van por encima de la pieza, donde se apoya cada división.");
        const pv = planoV(v, v.x + v.w / 2 < res.vista.ancho / 2 ? "der" : "izq");
        zs.forEach((z) => poner(pv.perfs, { x: z, y: encima ? v.h : 0, tipo: "tarugo_canto", canto: encima ? "arriba" : "abajo" }));
      }
    }
  }

  // 2. Puertas: cazoletas en la puerta y bases en la vertical del lado de la bisagra; jaladera
  const puertas = rects.filter((r) => r.tipo === "frente" && esPuerta(r.piezaId));
  for (const r of puertas) {
    const fila = puertas.filter((q) => Math.abs(q.y - r.y) < 20).sort((a, b) => a.x - b.x);
    const bisagra: "izq" | "der" = fila.length > 1 && fila.indexOf(r) % 2 === 1 ? "der" : "izq";
    const nb = bisagrasPorPuerta(r.h);
    const ys = Array.from({ length: nb }, (_, k) => 90 + ((r.h - 180) * k) / (nb - 1));
    const pp = planoP(r, r.w, r.h, "ancho de la puerta (vista de frente)", "alto de la puerta", `Puerta con bisagras a la ${bisagra === "izq" ? "izquierda" : "derecha"}`, `${r.piezaId}:${bisagra}:${Math.round(r.w)}x${Math.round(r.h)}`);
    pp.veces++;
    ys.forEach((y) => poner(pp.perfs, { x: bisagra === "izq" ? 22 : r.w - 22, y, tipo: "cazoleta" }));
    pp.notas.add("Dibujo visto de frente. La cazoleta se perfora por la cara de adentro (atrás), con el centro a 22 mm del borde.");
    // jaladera vertical en el lado contrario a la bisagra
    const xj = bisagra === "izq" ? r.w - 39 : 39;
    const yc = r.y > 900 ? 70 + JALADERA_ENTRE / 2 + 20 : r.y + r.h > 1400 ? Math.min(r.h / 2, 1050 - r.y) : r.h - 70 - JALADERA_ENTRE / 2;
    [yc - JALADERA_ENTRE / 2, yc + JALADERA_ENTRE / 2].forEach((y) => poner(pp.perfs, { x: xj, y, tipo: "jaladera" }));
    // base de la bisagra en la vertical más cercana al lado de la bisagra
    const xb = bisagra === "izq" ? r.x + e / 2 : r.x + r.w - e / 2;
    const v = verticales
      .filter((q) => solapa(q, r.y + r.h / 2))
      .sort((a, b) => Math.abs(a.x + a.w / 2 - xb) - Math.abs(b.x + b.w / 2 - xb))[0];
    if (v) {
      const cara: Cara = bisagra === "izq" ? "der" : "izq";
      const pv = planoV(v, cara);
      ys.forEach((y) => {
        const yy = r.y + y - v.y;
        if (yy < 0 || yy > v.h) return;
        poner(pv.perfs, { x: 37, y: yy - 16, tipo: "base_bisagra" });
        poner(pv.perfs, { x: 37, y: yy + 16, tipo: "base_bisagra" });
      });
    }
  }

  // 3. Cajones: correderas en las verticales y jaladera en el frente
  const frentes = rects.filter((r) => r.tipo === "frente" && !esPuerta(r.piezaId));
  const largoCorredera = Number(res.herrajes.find((h) => h.clave.startsWith("corredera_"))?.clave.split("_")[1]) || 400;
  for (const r of frentes) {
    const pf = planoP(r, r.w, r.h, "ancho del frente (vista de frente)", "alto del frente", "Frente de cajón");
    const yj = r.h - Math.min(45, r.h / 3);
    if (r.w > JALADERA_ENTRE + 40) [r.w / 2 - JALADERA_ENTRE / 2, r.w / 2 + JALADERA_ENTRE / 2].forEach((x) => poner(pf.perfs, { x, y: yj, tipo: "jaladera" }));
    else poner(pf.perfs, { x: r.w / 2, y: yj, tipo: "jaladera" });
    pf.notas.add("El frente se atornilla desde adentro a la caja del cajón con 4 tornillos 4×30, dejando la holgura pareja con los vecinos.");
    const yCorr = Math.max(37, Math.min(r.h - 40, 25 + Math.min(r.h - 60, 220) / 2)) + r.y;
    const centro = r.x + r.w / 2;
    const izq = verticales.filter((v) => v.x + v.w <= centro && solapa(v, yCorr)).sort((a, b) => b.x - a.x)[0];
    const der = verticales.filter((v) => v.x >= centro && solapa(v, yCorr)).sort((a, b) => a.x - b.x)[0];
    const xs = [37, 37 + (largoCorredera - 74) / 2, largoCorredera - 37];
    if (izq) xs.forEach((x) => poner(planoV(izq, "der").perfs, { x, y: yCorr - izq.y, tipo: "corredera" }));
    if (der) xs.forEach((x) => poner(planoV(der, "izq").perfs, { x, y: yCorr - der.y, tipo: "corredera" }));
  }

  // 4. Patas niveladoras bajo el piso
  if (rects.some((r) => r.piezaId === "pata") && !rects.some((r) => r.piezaId === "rodachina")) {
    const piso = estructura.find((r) => r.piezaId === "piso");
    if (piso) {
      const pp = planoP(piso, piso.w, hondo(piso), "largo de la pieza (de izquierda a derecha)", "desde el borde frontal (con canto)");
      const D = hondo(piso);
      for (const x of [40 - e, piso.w - 40 + e].map((x) => Math.max(30, Math.min(piso.w - 30, x))))
        for (const z of [60, D - 60]) poner(pp.perfs, { x, y: z, tipo: "pata" });
      pp.notas.add("Las patas se atornillan por debajo del piso.");
    }
  }

  // Armar la lista final: verticales agrupando las iguales
  const nombreVertical = (v: RectVista, cara: Cara) => {
    const base = pieza(v.piezaId)?.nombre ?? v.piezaId;
    if (v.piezaId === "lateral") {
      const izquierdo = v.x < res.vista.ancho / 2;
      const interior = (izquierdo && cara === "der") || (!izquierdo && cara === "izq");
      return `${base} ${izquierdo ? "izquierdo" : "derecho"}${interior ? " (cara de adentro)" : " (cara de afuera)"}`;
    }
    return `${base} (cara ${cara === "izq" ? "izquierda" : "derecha"})`;
  };
  const salida: PlanoPieza[] = [];
  const firmas = new Map<string, PlanoPieza>();
  for (const { r, cara, perfs, notas } of planosV.values()) {
    if (!perfs.length) continue;
    const D = hondo(r);
    const titulo = nombreVertical(r, cara);
    // en las verticales el dibujo se ve desde la cara perforada: el frente queda a la izquierda si miras la cara derecha
    const plano: PlanoPieza = {
      clave: `${r.piezaId}-${rects.indexOf(r)}-${cara}`,
      piezaId: r.piezaId,
      titulo,
      veces: 1,
      ancho: D,
      alto: r.h,
      ejeX: "desde el borde frontal (con canto) hacia atrás",
      ejeY: "desde abajo",
      perforaciones: perfs.sort((a, b) => a.y - b.y || a.x - b.x),
      notas: [...notas],
    };
    if (r.piezaId === "division") plano.notas.push("En las divisiones, si hay tarugos por las dos caras, corre los de una cara 16 mm para que no se encuentren.");
    const firma = `${r.piezaId}|${D}|${r.h}|${JSON.stringify(plano.perforaciones)}`;
    const igual = firmas.get(firma);
    if (igual && r.piezaId !== "lateral") igual.veces++;
    else {
      firmas.set(firma, plano);
      salida.push(plano);
    }
  }
  for (const { r, perfs, notas, ancho, alto, ejeX, ejeY, titulo, veces: contadas } of planosP.values()) {
    if (!perfs.length) continue;
    const veces = contadas || (pieza(r.piezaId)?.cantidad ?? 1);
    salida.push({ clave: `${r.piezaId}-${titulo}-${ancho}`, piezaId: r.piezaId, titulo, veces, ancho, alto, ejeX, ejeY, perforaciones: perfs.sort((a, b) => a.y - b.y || a.x - b.x), notas: [...notas] });
  }
  return salida;
}

/** Resumen de herramientas que usa un grupo de planos (para la leyenda). */
export function herramientasUsadas(planos: PlanoPieza[]) {
  const usadas = new Map<TipoPerf, number>();
  for (const p of planos) for (const h of p.perforaciones) usadas.set(h.tipo, (usadas.get(h.tipo) ?? 0) + p.veces);
  return [...usadas.entries()].map(([tipo, cantidad]) => ({ tipo, cantidad, ...HERRAMIENTAS[tipo] }));
}

/** Texto corto de una perforación para la lista: "Ø8 · 12 mm · a 37 del frente y 509 de abajo". */
export function textoPerforacion(p: Perforacion, plano: PlanoPieza) {
  const h = HERRAMIENTAS[p.tipo];
  const r = (n: number) => Math.round(n);
  const vertical = plano.ejeY === "desde abajo";
  const donde = vertical
    ? p.canto === "arriba" || p.canto === "abajo"
      ? `en el canto de ${p.canto}, a ${r(p.x)} mm del frente`
      : `a ${r(p.x)} mm del frente y ${r(p.y)} mm desde abajo`
    : plano.ejeY.startsWith("desde el borde frontal")
      ? `a ${r(p.y)} mm del frente${p.canto ? `, en el canto ${p.canto === "izq" ? "izquierdo" : "derecho"}` : `, a ${r(p.x)} mm del extremo izquierdo`}`
      : `a ${r(p.x)} mm del borde izquierdo y ${r(p.y)} mm desde abajo${p.canto ? ` (canto ${p.canto === "izq" ? "izquierdo" : "derecho"})` : ""}`;
  return `Ø${h.diametro} mm · ${h.profundidad} · ${donde}`;
}
