// Interpreta lo que dijo el carpintero (ya transcrito) y lo convierte en datos del formulario.
// Determinista: reglas en español, sin IA. Ejemplo: "bajo de cocina de 80 de ancho, 72 de alto, con dos puertas".

import { CATALOGO, buscarMueble } from "../motor/catalogo";
import type { ValoresParametros } from "../motor/tipos";

export interface Interpretacion {
  muebleId: string | null;
  valores: ValoresParametros;
  cantidad?: number;
  entendido: string[]; // frases legibles de lo que se entendió
}

const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18,
  diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
const DECENAS: Record<string, number> = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
const CENTENAS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400,
  quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
};

function esPalabraNumero(t: string) {
  return t in UNIDADES || t in DECENAS || t in CENTENAS || t === "mil";
}

/** Convierte números escritos en palabras a dígitos: "ochenta y cinco" → "85". */
export function palabrasANumeros(texto: string) {
  const tokens = texto.split(/\s+/);
  const salida: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (!esPalabraNumero(tokens[i])) {
      salida.push(tokens[i]);
      i++;
      continue;
    }
    let total = 0;
    let actual = 0;
    let j = i;
    while (j < tokens.length) {
      const t = tokens[j];
      if (t in UNIDADES) actual += UNIDADES[t];
      else if (t in DECENAS) actual += DECENAS[t];
      else if (t in CENTENAS) actual += CENTENAS[t];
      else if (t === "mil") {
        total += (actual || 1) * 1000;
        actual = 0;
      } else if (t === "y" && j + 1 < tokens.length && (tokens[j + 1] in UNIDADES) && j > i && tokens[j - 1] in DECENAS) {
        // "treinta y cinco"
      } else break;
      j++;
    }
    salida.push(String(total + actual));
    i = j;
  }
  return salida.join(" ");
}

export function normalizar(texto: string) {
  let t = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/[¿?¡!;:]/g, " ")
    .replace(/,/g, " , ")
    .replace(/\s+/g, " ")
    .trim();
  t = palabrasANumeros(t);
  // "1 metro y medio" → 1.5 m ; "1 metro 20" → 1.20 m
  t = t.replace(/(\d+) metros? y medio/g, (_, a) => `${Number(a) + 0.5} m`);
  t = t.replace(/(\d+) metros? (?:con )?(\d{1,2})\b(?!\s*(?:cm|centimetros?|mm|milimetros?))/g, (_, a, b) => `${Number(a) + Number(b) / 100} m`);
  t = t.replace(/\bmetro y medio\b/g, "1.5 m");
  t = t.replace(/\bmedio metro\b/g, "0.5 m");
  return t;
}

const UNIDAD = "(mm|milimetros?|cm|centimetros?|cms|m|mts?|metros?)?";

function aMilimetros(valor: number, unidad: string | undefined) {
  if (unidad) {
    if (unidad.startsWith("mil") || unidad === "mm") return valor;
    if (unidad.startsWith("c")) return valor * 10;
    return valor * 1000;
  }
  // sin unidad: se deduce por la magnitud
  if (valor <= 3) return valor * 1000;
  if (valor < 300) return valor * 10;
  return valor;
}

const MUEBLES: { id: string; patron: RegExp }[] = [
  { id: "mueble_tv", patron: /\b(mueble de (la )?(tv|tele|television)|rack|centro de entretenimiento|mueble tv)\b/ },
  { id: "despensero", patron: /\b(despensero|despensa|columna|torre de cocina|mueble alto de cocina)\b/ },
  { id: "zapatero", patron: /\b(zapatero|zapatera|mueble de zapatos|para zapatos)\b/ },
  { id: "vanitorio", patron: /\b(vanitorio|vanity|mueble de bano|lavamanos|lavatorio|mueble del bano)\b/ },
  { id: "aereo_cocina", patron: /\b(aereo|superior|alacena|de colgar|colgante)\b/ },
  { id: "bajo_cocina", patron: /\b(bajo|inferior|base|bajo mesada|cocina|lavaplatos|meson)\b/ },
  { id: "closet", patron: /\b(closet|clo[sc]et|ropero|armario|guardarropa|guardarropas)\b/ },
  { id: "mesa_noche", patron: /\b(mesa de noche|mesita|nochero|velador|buro)\b/ },
  { id: "escritorio", patron: /\b(escritorio|mesa de computador|mesa de estudio)\b/ },
  { id: "cajonera", patron: /\b(cajonera|comoda|cajonero|chifonier)\b/ },
  { id: "librero", patron: /\b(librero|repisa|biblioteca|estante|estanteria|libreria)\b/ },
];

const DIMENSIONES: { clave: string; palabras: string }[] = [
  { clave: "ancho", palabras: "ancho|anchura|largo|frente" },
  { clave: "alto", palabras: "alto|altura|alta" },
  { clave: "fondo", palabras: "fondo|profundidad|profundo" },
];

const CONTEOS: { clave: string; palabras: string }[] = [
  { clave: "puertas", palabras: "puertas?" },
  { clave: "cajones", palabras: "cajon(?:es)?" },
  { clave: "entrepanos", palabras: "entrepanos?|repisas?|baldas?|estantes?|niveles?" },
  { clave: "columnas", palabras: "columnas?|divisiones?" },
  { clave: "cuerpos", palabras: "cuerpos?|modulos?|secciones?" },
];

export function interpretar(texto: string, muebleActual: string | null): Interpretacion {
  const t = normalizar(texto);
  const entendido: string[] = [];
  let muebleId: string | null = null;
  // "aéreo" necesita contexto de cocina o mueble; si dice "mueble alto de cocina" también es aéreo
  for (const m of MUEBLES) {
    if (m.patron.test(t)) {
      muebleId = m.id;
      break;
    }
  }
  if (muebleId === "bajo_cocina" && /\b(mueble|modulo) alto de cocina\b/.test(t)) muebleId = "aereo_cocina";
  const elegido = muebleId ?? muebleActual;
  const def = elegido ? buscarMueble(elegido) : null;
  if (muebleId && def) entendido.push(def.nombre);
  const valores: ValoresParametros = {};
  if (!def) return { muebleId, valores, entendido };
  const tiene = (clave: string) => def.parametros.find((p) => p.clave === clave);

  const poner = (clave: string, v: number | boolean | string, frase: string) => {
    const p = tiene(clave);
    if (!p) return false;
    if (typeof v === "number" && (p.tipo === "medida" || p.tipo === "entero")) v = Math.min(p.max, Math.max(p.min, Math.round(v)));
    valores[clave] = v;
    entendido.push(frase);
    return true;
  };

  // Formato "80 x 72 x 56" → ancho × alto × fondo
  const triple = t.match(new RegExp(`(\\d+(?:\\.\\d+)?) ?${UNIDAD} ?(?:x|por) ?(\\d+(?:\\.\\d+)?) ?${UNIDAD} ?(?:(?:x|por) ?(\\d+(?:\\.\\d+)?) ?${UNIDAD})?`));
  if (triple && !/^ ?(puertas?|cajon)/.test(t.slice(triple.index! + triple[0].length))) {
    const [, a, ua, b, ub, c, uc] = triple;
    poner("ancho", aMilimetros(Number(a), ua ?? ub ?? uc), `Ancho ${Math.round(aMilimetros(Number(a), ua ?? ub ?? uc))} mm`);
    poner("alto", aMilimetros(Number(b), ub ?? ua ?? uc), `Alto ${Math.round(aMilimetros(Number(b), ub ?? ua ?? uc))} mm`);
    if (c) poner("fondo", aMilimetros(Number(c), uc ?? ua ?? ub), `Fondo ${Math.round(aMilimetros(Number(c), uc ?? ua ?? ub))} mm`);
  }

  for (const d of DIMENSIONES) {
    const antes = new RegExp(`(\\d+(?:\\.\\d+)?) ?${UNIDAD} (?:de |en )(?:${d.palabras})\\b`);
    const despues = new RegExp(`\\b(?:${d.palabras}) (?:de |es de |:)?(\\d+(?:\\.\\d+)?) ?${UNIDAD}`);
    const m = t.match(antes) ?? t.match(despues);
    if (m) {
      const v = aMilimetros(Number(m[1]), m[2]);
      poner(d.clave, v, `${d.clave[0].toUpperCase()}${d.clave.slice(1)} ${Math.round(v)} mm`);
    }
  }

  // zócalo y patas
  const zoc = t.match(new RegExp(`zocalo (?:de )?(\\d+(?:\\.\\d+)?) ?${UNIDAD}`));
  if (zoc) poner("zocalo", aMilimetros(Number(zoc[1]), zoc[2] ?? "cm"), `Zócalo ${Math.round(aMilimetros(Number(zoc[1]), zoc[2] ?? "cm"))} mm`);
  if (/\bsin zocalo\b/.test(t)) poner("zocalo", 0, "Sin zócalo");
  const patas = t.match(new RegExp(`patas (?:de )?(\\d+(?:\\.\\d+)?) ?${UNIDAD}`));
  if (patas) poner("patas", aMilimetros(Number(patas[1]), patas[2] ?? "cm"), `Patas ${Math.round(aMilimetros(Number(patas[1]), patas[2] ?? "cm"))} mm`);
  if (/\bsin patas\b/.test(t)) poner("patas", 0, "Sin patas");

  for (const c of CONTEOS) {
    const m = t.match(new RegExp(`\\b(\\d+) (?:${c.palabras})\\b`));
    if (m) {
      const n = Number(m[1]);
      if (c.clave === "columnas" && !tiene("columnas") && tiene("cuerpos")) poner("cuerpos", n, `${n} cuerpos`);
      else if (c.clave === "cuerpos" && !tiene("cuerpos") && tiene("columnas")) poner("columnas", n, `${n} columnas`);
      else if (c.clave === "entrepanos" && !tiene("entrepanos") && tiene("entrepano")) poner("entrepano", n > 0, n > 0 ? "Con entrepaño" : "Sin entrepaño");
      else poner(c.clave, c.clave === "columnas" && /divisiones?/.test(m[0]) ? n + 1 : n, `${n} ${m[0].split(" ").slice(1).join(" ")}`);
    }
  }

  // tipo de frente (mueble bajo de cocina)
  if (tiene("frente")) {
    const conCajon = /\bcajon/.test(t);
    const conPuerta = /\bpuertas?\b/.test(t);
    if (conCajon && conPuerta) poner("frente", "mixto", "Cajón + puertas");
    else if (conCajon) poner("frente", "cajones", "Con cajones");
    else if (conPuerta) poner("frente", "puertas", "Con puertas");
  }

  // sí / no
  if (/\bsin (fondo|espaldar|trasero)\b/.test(t)) poner("conFondo", false, "Sin fondo");
  else if (/\bcon (fondo|espaldar)\b/.test(t)) poner("conFondo", true, "Con fondo");
  if (/\bsin puertas\b/.test(t)) {
    if (tiene("puertas")?.tipo === "si_no") poner("puertas", false, "Sin puertas");
    else poner("puertas", 0, "Sin puertas");
  } else if (tiene("puertas")?.tipo === "si_no" && /\bcon puertas\b/.test(t)) poner("puertas", true, "Con puertas");
  if (/\bsin (tubo|colgador)\b/.test(t)) poner("tubo", false, "Sin tubo");
  else if (/\b(tubo|colgador)\b/.test(t)) poner("tubo", true, "Con tubo colgador");
  if (/\bsin maletero\b/.test(t)) poner("maletero", 0, "Sin maletero");
  if (/\bsin cajonera\b/.test(t) || /\bsin cajones\b/.test(t)) poner("cajonera", false, "Sin cajonera");
  else if (/\bcon cajonera\b/.test(t)) poner("cajonera", true, "Con cajonera");
  if (/\bsin faldon\b/.test(t)) poner("faldon", 0, "Sin faldón");
  if (/\bsin entrepano\b/.test(t)) poner("entrepano", false, "Sin entrepaño");

  // cantidad de muebles iguales
  let cantidad: number | undefined;
  const cant = t.match(/\b(\d+) (?:muebles|modulos|unidades|iguales)\b/) ?? t.match(/\bcantidad (?:de )?(\d+)\b/);
  if (cant) {
    cantidad = Math.max(1, Math.min(50, Number(cant[1])));
    entendido.push(`Cantidad: ${cantidad}`);
  }
  return { muebleId, valores, cantidad, entendido };
}

export const EJEMPLOS_VOZ = [
  "Mueble bajo de cocina de 80 de ancho, 72 de alto y 56 de fondo con dos puertas",
  "Closet de 1 metro 80 de ancho por 2 metros 10 de alto, 3 cuerpos con tubo",
  "Librero de 90 por 180 con 5 entrepaños sin fondo",
];

export const CATALOGO_IDS = CATALOGO.map((c) => c.id);
