// Foto de referencia → mueble del catálogo. Compartido entre la ruta /api/foto (arma el prompt y valida)
// y el navegador (tipos). La IA solo elige mueble, medidas y colores; el cálculo de cortes sigue siendo el del motor.

import { CATALOGO, buscarMueble, valoresPorDefecto } from "./motor/catalogo";
import type { ValoresParametros } from "./motor/tipos";
import { ACABADOS, JALADERAS } from "./acabados";

export interface PropuestaReferencia {
  muebleId: string;
  nombre: string;
  valores: ValoresParametros;
  cantidad: number;
  acabados: { cuerpo: string; frente: string; jaladera: string };
  explicacion: string;
  diferencias: string[];
  confianza: "alta" | "media" | "baja";
}

/** Catálogo en texto corto para el prompt: id, nombre y parámetros con sus rangos (medidas en mm). */
export function catalogoParaIA() {
  return CATALOGO.map((m) => {
    const ps = m.parametros
      .map((p) => {
        if (p.tipo === "medida") return `${p.clave} (${p.etiqueta}, mm ${p.min}-${p.max}, defecto ${p.defecto})`;
        if (p.tipo === "entero") return `${p.clave} (${p.etiqueta}, entero ${p.min}-${p.max}, defecto ${p.defecto})`;
        if (p.tipo === "si_no") return `${p.clave} (${p.etiqueta}, true/false, defecto ${p.defecto})`;
        return `${p.clave} (${p.etiqueta}, una de: ${p.opciones.map((o) => `"${o.valor}"=${o.etiqueta}`).join(", ")}; defecto "${p.defecto}")`;
      })
      .join("; ");
    return `- ${m.id}: ${m.nombre}. ${m.descripcion} Parámetros: ${ps}`;
  }).join("\n");
}

export function promptReferencia() {
  return [
    "Eres un carpintero experto en muebles de melamina en Latinoamérica. Te muestran la foto de un mueble que el cliente quiere replicar.",
    "Tu trabajo: elegir del catálogo el mueble que mejor lo replica y estimar sus parámetros para que se vea lo más parecido posible.",
    "Estima las medidas reales en milímetros usando referencias de la foto (altura de mesón ~900 mm, puerta ~2000 mm, enchufe ~300 mm del piso, un libro ~240 mm, etc.).",
    "Si el usuario da medidas en la nota, úsalas siempre por encima de tu estimación (convierte cm o m a mm).",
    "Cuenta con cuidado puertas, cajones, cuerpos, columnas y entrepaños visibles.",
    "Colores: elige el más parecido para el cuerpo (estructura) y el frente (puertas y cajones) de esta lista de ids: " +
      ACABADOS.map((a) => `${a.id} (${a.nombre})`).join(", ") +
      '. Si ninguno se parece, usa un color hexadecimal como "#7a8b5c". Jaladera, uno de: ' +
      JALADERAS.map((a) => `${a.id} (${a.nombre})`).join(", ") +
      ".",
    "Catálogo disponible:",
    catalogoParaIA(),
    "Responde SOLO un objeto JSON, sin texto alrededor, con esta forma:",
    '{"muebleId": "id del catálogo", "valores": {"clave": valor, ...}, "cantidad": 1, "acabados": {"cuerpo": "id", "frente": "id", "jaladera": "id"}, ' +
      '"explicacion": "una o dos frases en español sencillo diciendo qué ves y qué armaste", ' +
      '"diferencias": ["cosas de la foto que el catálogo no puede copiar igual, en frases cortas"], "confianza": "alta|media|baja"}',
    'Si la foto no muestra un mueble, responde {"muebleId": null, "explicacion": "qué se ve"}.',
  ].join("\n");
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Valida y ajusta lo que respondió la IA a los rangos del catálogo. Devuelve null si no hay mueble. */
export function validarPropuesta(crudo: unknown): PropuestaReferencia | null {
  const o = (crudo && typeof crudo === "object" ? crudo : {}) as Record<string, unknown>;
  const def = typeof o.muebleId === "string" ? buscarMueble(o.muebleId) : undefined;
  if (!def) return null;
  const entrada = (o.valores && typeof o.valores === "object" ? o.valores : {}) as Record<string, unknown>;
  const valores: ValoresParametros = valoresPorDefecto(def);
  for (const p of def.parametros) {
    const v = entrada[p.clave];
    if (v === undefined || v === null) continue;
    if (p.tipo === "medida" || p.tipo === "entero") {
      const n = typeof v === "number" ? v : parseFloat(String(v));
      if (!Number.isFinite(n)) continue;
      const r = p.tipo === "entero" ? Math.round(n) : Math.round(n / 10) * 10;
      valores[p.clave] = Math.min(p.max, Math.max(p.min, r));
    } else if (p.tipo === "si_no") {
      valores[p.clave] = v === true || v === "true" || v === "si" || v === "sí";
    } else if (p.opciones.some((op) => op.valor === String(v))) {
      valores[p.clave] = String(v);
    }
  }
  const ac = (o.acabados && typeof o.acabados === "object" ? o.acabados : {}) as Record<string, unknown>;
  const color = (v: unknown, def: string) => (typeof v === "string" && (ACABADOS.some((a) => a.id === v) || HEX.test(v)) ? v.toLowerCase() : def);
  const jal = typeof ac.jaladera === "string" && JALADERAS.some((a) => a.id === ac.jaladera) ? ac.jaladera : "negro";
  const cant = Math.round(Number(o.cantidad));
  const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  return {
    muebleId: def.id,
    nombre: def.nombre,
    valores,
    cantidad: Number.isFinite(cant) ? Math.min(20, Math.max(1, cant)) : 1,
    acabados: { cuerpo: color(ac.cuerpo, "blanco"), frente: color(ac.frente, "roble"), jaladera: jal },
    explicacion: texto(o.explicacion, 400),
    diferencias: Array.isArray(o.diferencias) ? o.diferencias.map((d) => texto(d, 160)).filter(Boolean).slice(0, 5) : [],
    confianza: o.confianza === "alta" || o.confianza === "baja" ? o.confianza : "media",
  };
}

/** Saca el JSON de la respuesta aunque venga dentro de ```json ... ```. */
export function extraerJson(texto: string): unknown {
  const limpio = texto.replace(/```(?:json)?/gi, "").trim();
  const i = limpio.indexOf("{");
  const j = limpio.lastIndexOf("}");
  if (i < 0 || j <= i) return null;
  try {
    return JSON.parse(limpio.slice(i, j + 1));
  } catch {
    return null;
  }
}
