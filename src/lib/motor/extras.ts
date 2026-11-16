// Opciones que se suman a varios muebles sin tocar su diseño: luz LED y rodachinas.
// Agregan parámetros al formulario, herrajes al costo, pasos de armado y piezas de detalle para el 3D.

import type { DefinicionMueble, Herraje, Parametro, RectVista, ResultadoMueble, ValoresParametros } from "./tipos";

/** Muebles donde tiene sentido iluminar por dentro. */
const CON_LED = new Set(["closet", "librero", "mueble_tv", "aereo_cocina", "despensero", "vanitorio", "zapatero", "repisa_flotante", "aparador"]);
/** Muebles que van al piso y se pueden mover. */
const CON_RODACHINAS = new Set(["librero", "escritorio", "mueble_tv", "zapatero", "cajonera", "mesa_noche", "closet", "despensero", "mesa_centro", "aparador"]);

const PARAM_LED: Parametro = {
  clave: "luzLed",
  etiqueta: "Luz LED",
  tipo: "opcion",
  defecto: "no",
  opciones: [
    { valor: "no", etiqueta: "Sin luz" },
    { valor: "arriba", etiqueta: "Solo arriba" },
    { valor: "todos", etiqueta: "En cada nivel" },
  ],
  ayuda: "Cinta LED con perfil de aluminio bajo el techo o bajo cada entrepaño, con fuente y sensor",
};

const PARAM_RUEDAS: Parametro = {
  clave: "rodachinas",
  etiqueta: "Rodachinas (ruedas)",
  tipo: "si_no",
  defecto: false,
  ayuda: "Reemplazan las patas; suman unos 5 cm de alto",
};

export const NOMBRES_EXTRAS: Record<string, { nombre: string; unidad: string }> = {
  led_cinta: { nombre: "Cinta LED con perfil de aluminio", unidad: "m" },
  led_fuente: { nombre: "Fuente LED 12 V", unidad: "u" },
  led_sensor: { nombre: "Sensor de puerta o interruptor LED", unidad: "u" },
  rodachina: { nombre: "Rodachina giratoria 2\" (2 con freno)", unidad: "u" },
};

/** Superficies horizontales bajo las que se puede pegar una cinta LED. */
const HORIZONTAL = /^(techo|travesano|entrepano|maletero|fijo|repisa|nivel)/;

function agregarHerraje(lista: Herraje[], clave: string, cantidad: number) {
  if (cantidad <= 0) return;
  const h = lista.find((x) => x.clave === clave);
  if (h) h.cantidad = Math.round((h.cantidad + cantidad) * 10) / 10;
  else lista.push({ clave, nombre: NOMBRES_EXTRAS[clave].nombre, cantidad: Math.round(cantidad * 10) / 10, unidad: NOMBRES_EXTRAS[clave].unidad });
}

function aplicarLed(res: ResultadoMueble, modo: string) {
  const superficies = res.vista.rects.filter((r) => r.tipo === "estructura" && HORIZONTAL.test(r.piezaId) && r.w > r.h * 3 && r.y > 150);
  if (!superficies.length) return;
  const maxY = Math.max(...superficies.map((r) => r.y));
  const elegidas = modo === "arriba" ? superficies.filter((r) => r.y >= maxY - 5) : superficies;
  const cintas: RectVista[] = elegidas.map((r) => ({ piezaId: "led", x: r.x + 20, y: r.y - 10, w: Math.max(50, r.w - 40), h: 10, tipo: "detalle" }));
  res.vista.rects.push(...cintas);
  const metros = Math.ceil((cintas.reduce((s, c) => s + c.w, 0) / 1000) * 10) / 10;
  agregarHerraje(res.herrajes, "led_cinta", metros);
  agregarHerraje(res.herrajes, "led_fuente", 1);
  agregarHerraje(res.herrajes, "led_sensor", 1);
  res.pasos.push({
    titulo: "Instalar la luz LED",
    descripcion: `Pega ${cintas.length} perfil(es) de aluminio con cinta LED (${metros} m en total) bajo ${modo === "arriba" ? "el techo" : "el techo y cada entrepaño"}, a 2 cm del frente. Pasa el cable por una perforación de 8 mm en la parte trasera hasta la fuente de 12 V y el sensor.`,
    piezas: [],
    herrajes: ["led_cinta", "led_fuente", "led_sensor"],
  });
}

function aplicarRuedas(res: ResultadoMueble) {
  const A = res.vista.ancho;
  // las ruedas reemplazan las patas niveladoras: el cuerpo baja al piso antes de montarlo en ruedas
  res.vista.rects = res.vista.rects.filter((r) => r.piezaId !== "pata");
  const base = Math.min(...res.vista.rects.map((r) => r.y));
  if (base > 0) {
    for (const r of res.vista.rects) r.y -= base;
    for (const c of res.vista.cotas) {
      c.y1 = Math.max(0, c.y1 - base);
      c.y2 = Math.max(0, c.y2 - base);
    }
    res.vista.alto -= base;
  }
  res.herrajes = res.herrajes.filter((h) => h.clave !== "pata_niveladora");
  res.pasos = res.pasos.filter((p) => !p.herrajes?.includes("pata_niveladora"));
  const n = A > 1500 ? 3 : 2; // ruedas por lado (adelante y atrás)
  for (let i = 0; i < n; i++) {
    const x = n === 2 ? (i === 0 ? 30 : A - 80) : 30 + ((A - 110) * i) / (n - 1);
    res.vista.rects.push({ piezaId: "rodachina", x, y: -50, w: 50, h: 50, tipo: "detalle" });
  }
  agregarHerraje(res.herrajes, "rodachina", n * 2);
  res.pasos.push({
    titulo: "Atornillar las rodachinas",
    descripcion: `Con el mueble acostado, atornilla ${n * 2} rodachinas bajo el piso, a 3 cm de los bordes, con 4 tornillos de 4×16 cada una. Las de freno van adelante.`,
    piezas: [],
    herrajes: ["rodachina", "tornillo_corto"],
  });
  const t = res.herrajes.find((h) => h.clave === "tornillo_corto");
  if (t) t.cantidad += n * 2 * 4;
  else res.herrajes.push({ clave: "tornillo_corto", nombre: "Tornillo 4×16 (herrajes)", cantidad: n * 2 * 4, unidad: "u" });
  // el mueble queda 5 cm más alto: todo sube
  for (const r of res.vista.rects) r.y += 50;
  for (const c of res.vista.cotas) {
    c.y1 += 50;
    c.y2 += 50;
  }
  res.vista.alto += 50;
}

/** Devuelve el mueble con las opciones de LED y rodachinas que le correspondan. */
export function conExtras(def: DefinicionMueble): DefinicionMueble {
  const led = CON_LED.has(def.id);
  const ruedas = CON_RODACHINAS.has(def.id);
  if (!led && !ruedas) return def;
  return {
    ...def,
    parametros: [...def.parametros, ...(led ? [PARAM_LED] : []), ...(ruedas ? [PARAM_RUEDAS] : [])],
    generar(p: ValoresParametros, cfg) {
      const res = def.generar(p, cfg);
      const modo = String(p.luzLed ?? "no");
      if (led && modo !== "no") aplicarLed(res, modo);
      if (ruedas && p.rodachinas === true) aplicarRuedas(res);
      return res;
    },
  };
}
