import type {
  Cantos,
  ClaveMaterial,
  Configuracion,
  Cota,
  Herraje,
  PasoArmado,
  Pieza,
  RectVista,
  ResultadoMueble,
} from "./tipos";

export const SIN_CANTO: Cantos = { largo1: false, largo2: false, ancho1: false, ancho2: false };
export const CANTO_UN_LARGO: Cantos = { largo1: true, largo2: false, ancho1: false, ancho2: false };
export const CANTO_CUATRO: Cantos = { largo1: true, largo2: true, ancho1: true, ancho2: true };

const NOMBRES_HERRAJE: Record<string, { nombre: string; unidad: string }> = {
  bisagra: { nombre: "Bisagra cazoleta 35 mm", unidad: "u" },
  jaladera: { nombre: "Jaladera / manija", unidad: "u" },
  tornillo: { nombre: "Tornillo para aglomerado 4×50", unidad: "u" },
  tornillo_corto: { nombre: "Tornillo 4×16 (herrajes)", unidad: "u" },
  soporte_entrepano: { nombre: "Soporte de entrepaño (pin)", unidad: "u" },
  pata_niveladora: { nombre: "Pata niveladora plástica", unidad: "u" },
  tubo_colgador: { nombre: "Tubo colgador ovalado", unidad: "m" },
  soporte_tubo: { nombre: "Soporte de tubo colgador", unidad: "u" },
  clavo_fondo: { nombre: "Grapa / clavo para fondo", unidad: "u" },
  colgador_mueble: { nombre: "Colgador de mueble aéreo", unidad: "u" },
};

export function nombreCorredera(largo: number) {
  return { clave: `corredera_${largo}`, nombre: `Corredera telescópica ${largo} mm (par)` };
}

export function bisagrasPorPuerta(altoPuerta: number) {
  if (altoPuerta <= 900) return 2;
  if (altoPuerta <= 1600) return 3;
  if (altoPuerta <= 2000) return 4;
  return 5;
}

/** Largo comercial de corredera según fondo disponible. */
export function largoCorredera(fondoDisponible: number) {
  const medidas = [250, 300, 350, 400, 450, 500, 550, 600];
  let elegido = 0;
  for (const m of medidas) if (m <= fondoDisponible) elegido = m;
  return elegido;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export class Constructor {
  piezas: Pieza[] = [];
  herrajes = new Map<string, Herraje>();
  rects: RectVista[] = [];
  cotas: Cota[] = [];
  pasos: PasoArmado[] = [];
  advertencias: string[] = [];

  constructor(public c: Configuracion) {}

  get e() {
    return this.c.materiales.cuerpo.espesor;
  }
  get eFondo() {
    return this.c.materiales.fondo.espesor;
  }
  get eFrente() {
    return this.c.materiales.frente.espesor;
  }

  pieza(
    id: string,
    nombre: string,
    largo: number,
    ancho: number,
    cantidad: number,
    material: ClaveMaterial,
    cantos: Cantos,
    nota?: string,
  ) {
    if (cantidad <= 0) return;
    if (largo <= 0 || ancho <= 0) {
      this.advertencias.push(`La pieza "${nombre}" quedó con medidas inválidas; revisa las medidas del mueble.`);
      return;
    }
    const existente = this.piezas.find((p) => p.id === id);
    if (existente) {
      existente.cantidad += cantidad;
      return;
    }
    this.piezas.push({ id, nombre, largo: r1(largo), ancho: r1(ancho), cantidad, material, cantos, nota });
  }

  herraje(clave: string, cantidad: number, nombre?: string, unidad?: string) {
    if (cantidad <= 0) return;
    const def = NOMBRES_HERRAJE[clave];
    const h = this.herrajes.get(clave);
    if (h) h.cantidad = r1(h.cantidad + cantidad);
    else
      this.herrajes.set(clave, {
        clave,
        nombre: nombre ?? def?.nombre ?? clave,
        cantidad: r1(cantidad),
        unidad: unidad ?? def?.unidad ?? "u",
      });
  }

  rect(piezaId: string, x: number, y: number, w: number, h: number, tipo: RectVista["tipo"] = "estructura", etiqueta?: string) {
    this.rects.push({ piezaId, x, y, w, h, tipo, etiqueta });
  }

  cota(x1: number, y1: number, x2: number, y2: number, desplazamiento: number, texto?: string) {
    const largo = Math.round(Math.hypot(x2 - x1, y2 - y1));
    this.cotas.push({ x1, y1, x2, y2, desplazamiento, texto: texto ?? `${largo}` });
  }

  paso(titulo: string, descripcion: string, piezas: string[], herrajes?: string[]) {
    this.pasos.push({ titulo, descripcion, piezas, herrajes });
  }

  /** Fondo de HDF clavado por detrás, cubriendo el cuerpo. Se divide si no cabe en una lámina. */
  fondoClavado(id: string, ancho: number, alto: number, x: number, y: number) {
    const m = this.c.materiales.fondo;
    const w = ancho - 4;
    const h = alto - 4;
    const cabe = (a: number, b: number) =>
      (Math.max(a, b) <= m.largoLamina - 2 * this.c.refilado && Math.min(a, b) <= m.anchoLamina - 2 * this.c.refilado);
    let partes = 1;
    while (!cabe(w / partes, h) && partes < 6) partes++;
    const wp = w / partes;
    this.pieza(id, partes > 1 ? `Fondo (trasero, ${partes} partes)` : "Fondo (trasero)", Math.max(wp, h), Math.min(wp, h), partes, "fondo", SIN_CANTO, "Se clava por detrás, a escuadra");
    this.rect(id, x, y, ancho, alto, "detalle");
    this.herraje("clavo_fondo", Math.ceil(((w + h) * 2) / 100) * partes);
  }

  /**
   * Caja básica: dos laterales hasta el piso, piso (elevado por el zócalo), techo o travesaños y fondo.
   * yBase es la altura de patas (el cuerpo empieza ahí).
   */
  caja(o: { A: number; H: number; F: number; yBase?: number; conFondo?: boolean; superior?: "techo" | "travesanos"; zocalo?: number }) {
    const e = this.e;
    const yB = o.yBase ?? 0;
    const z = o.zocalo ?? 0;
    const conFondo = o.conFondo ?? true;
    const fi = o.F - (conFondo ? this.eFondo : 0);
    const ai = o.A - 2 * e;
    const superior = o.superior ?? "techo";
    this.pieza("lateral", "Lateral", o.H, fi, 2, "cuerpo", { ...CANTO_UN_LARGO, ancho1: superior === "techo" });
    this.rect("lateral", 0, yB, e, o.H);
    this.rect("lateral", o.A - e, yB, e, o.H);
    this.pieza("piso", "Piso", ai, fi, 1, "cuerpo", CANTO_UN_LARGO);
    this.rect("piso", e, yB + z, ai, e);
    if (z > 0) {
      this.pieza("zocalo", "Zócalo", ai, z, 1, "cuerpo", CANTO_UN_LARGO, "Va al frente, debajo del piso");
      this.rect("zocalo", e, yB, ai, z);
    }
    if (superior === "techo") {
      this.pieza("techo", "Techo", ai, fi, 1, "cuerpo", CANTO_UN_LARGO);
      this.rect("techo", e, yB + o.H - e, ai, e);
    } else {
      this.pieza("travesano", "Travesaño superior", ai, 100, 2, "cuerpo", CANTO_UN_LARGO, "Uno adelante y otro atrás");
      this.rect("travesano", e, yB + o.H - e, ai, e);
    }
    const uniones = 2 + (z > 0 ? 1 : 0);
    this.herraje("tornillo", uniones * 2 * 3);
    if (conFondo) this.fondoClavado("fondo", o.A, o.H, 0, yB);
    const yIni = yB + z + e;
    return { ai, fi, e, yIni, altoHueco: yB + o.H - e - yIni, piezasCaja: ["lateral", "piso", ...(z > 0 ? ["zocalo"] : []), superior === "techo" ? "techo" : "travesano"] };
  }

  /**
   * Entrepaños regularmente espaciados dentro de un hueco.
   * Devuelve las alturas (y) de cada entrepaño.
   */
  entrepanos(id: string, cantidad: number, x: number, yInicio: number, anchoHueco: number, altoHueco: number, fondo: number, fijos = false) {
    const ys: number[] = [];
    if (cantidad <= 0) return ys;
    const paso = (altoHueco - cantidad * this.e) / (cantidad + 1);
    for (let i = 0; i < cantidad; i++) {
      const y = yInicio + paso * (i + 1) + this.e * i;
      ys.push(y);
      this.rect(id, x, y, anchoHueco, this.e, "estructura");
    }
    const anchoPieza = fijos ? anchoHueco : anchoHueco - 2;
    this.pieza(id, fijos ? "Entrepaño fijo" : "Entrepaño", anchoPieza, fondo, cantidad, "cuerpo", CANTO_UN_LARGO);
    if (fijos) this.herraje("tornillo", cantidad * 4);
    else this.herraje("soporte_entrepano", cantidad * 4);
    return ys;
  }

  /** Puertas de sobreponer (cubren el cuerpo). */
  puertas(id: string, cantidad: number, x: number, y: number, anchoTotal: number, altoTotal: number) {
    if (cantidad <= 0) return;
    const h = this.c.holgura;
    const anchoP = (anchoTotal - h * cantidad) / cantidad;
    const altoP = altoTotal - h;
    for (let i = 0; i < cantidad; i++) {
      this.rect(id, x + h / 2 + i * (anchoP + h), y + h / 2, anchoP, altoP, "frente", cantidad > 1 ? `P${i + 1}` : "Puerta");
    }
    this.pieza(id, "Puerta", Math.max(altoP, anchoP), Math.min(altoP, anchoP), cantidad, "frente", CANTO_CUATRO);
    this.herraje("bisagra", bisagrasPorPuerta(altoP) * cantidad);
    this.herraje("jaladera", cantidad);
    this.herraje("tornillo_corto", bisagrasPorPuerta(altoP) * cantidad * 4 + cantidad * 2);
    if (anchoP > 600) this.advertencias.push(`Las puertas quedan de ${Math.round(anchoP)} mm de ancho; conviene usar más puertas (máx. 600 mm).`);
  }

  /**
   * Cajones con frente de sobreponer y corredera telescópica.
   * anchoHueco/altoHueco: espacio interior libre. Frente cubre anchoFrente×altoFrente.
   */
  cajones(
    prefijo: string,
    cantidad: number,
    anchoHueco: number,
    fondoHueco: number,
    xFrente: number,
    yFrente: number,
    anchoFrente: number,
    altoFrente: number,
  ) {
    if (cantidad <= 0) return;
    const h = this.c.holgura;
    const altoF = (altoFrente - h * cantidad) / cantidad;
    const anchoF = anchoFrente - h;
    const corredera = largoCorredera(fondoHueco - 20);
    if (!corredera) {
      this.advertencias.push("El fondo es muy corto para correderas (mín. 270 mm).");
      return;
    }
    const e = this.e;
    const anchoCaja = anchoHueco - 2 * 13; // 12.7 mm por lado de corredera
    const altoCaja = Math.max(80, Math.min(altoF - 40, 250));
    for (let i = 0; i < cantidad; i++) {
      this.rect(`${prefijo}_frente`, xFrente + h / 2, yFrente + h / 2 + i * (altoF + h), anchoF, altoF, "frente", `C${cantidad - i}`);
    }
    this.pieza(`${prefijo}_frente`, "Frente de cajón", Math.max(anchoF, altoF), Math.min(anchoF, altoF), cantidad, "frente", CANTO_CUATRO);
    this.pieza(`${prefijo}_costado`, "Costado de cajón", corredera, altoCaja, cantidad * 2, "cuerpo", CANTO_UN_LARGO);
    this.pieza(`${prefijo}_contra`, "Frente/trasera interior de cajón", anchoCaja - 2 * e, altoCaja, cantidad * 2, "cuerpo", CANTO_UN_LARGO);
    this.pieza(`${prefijo}_piso`, "Piso de cajón", Math.max(anchoCaja, corredera), Math.min(anchoCaja, corredera), cantidad, "fondo", SIN_CANTO, "Se clava por debajo");
    const c = nombreCorredera(corredera);
    this.herraje(c.clave, cantidad, c.nombre, "par");
    this.herraje("jaladera", cantidad);
    this.herraje("tornillo", cantidad * 8);
    this.herraje("tornillo_corto", cantidad * 12);
    this.herraje("clavo_fondo", cantidad * 12);
    return { corredera, altoCaja, anchoCaja };
  }

  resultado(ancho: number, alto: number): ResultadoMueble {
    return {
      piezas: this.piezas,
      herrajes: [...this.herrajes.values()],
      vista: { ancho, alto, rects: this.rects, cotas: this.cotas },
      pasos: this.pasos,
      advertencias: this.advertencias,
    };
  }
}

export const num = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? v : d);
export const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
export const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);
