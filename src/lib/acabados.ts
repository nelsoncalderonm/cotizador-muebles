// Acabados disponibles para la vista 3D: colores lisos de melamina, maderas y jaladeras.

export interface Acabado {
  id: string;
  nombre: string;
  base: string; // color principal
  veta?: string; // color de la veta (si es madera)
  rugosidad: number;
}

export interface AcabadoMetal {
  id: string;
  nombre: string;
  color: string;
  metal: number;
  rugosidad: number;
}

export const ACABADOS: Acabado[] = [
  { id: "blanco", nombre: "Blanco", base: "#f1efea", rugosidad: 0.45 },
  { id: "humo", nombre: "Gris humo", base: "#b8b5ae", rugosidad: 0.5 },
  { id: "grafito", nombre: "Grafito", base: "#3e4044", rugosidad: 0.55 },
  { id: "negro", nombre: "Negro mate", base: "#1f1f21", rugosidad: 0.7 },
  { id: "salvia", nombre: "Verde salvia", base: "#8e9b84", rugosidad: 0.55 },
  { id: "petroleo", nombre: "Azul petróleo", base: "#2f4a56", rugosidad: 0.5 },
  { id: "marino", nombre: "Azul marino", base: "#1f3350", rugosidad: 0.5 },
  { id: "arena", nombre: "Arena", base: "#d8cbb4", rugosidad: 0.5 },
  { id: "roble_claro", nombre: "Roble claro", base: "#d9bf96", veta: "#b8956a", rugosidad: 0.6 },
  { id: "roble", nombre: "Roble natural", base: "#c49a68", veta: "#966c40", rugosidad: 0.6 },
  { id: "cerezo", nombre: "Cerezo", base: "#a3613f", veta: "#7a4227", rugosidad: 0.55 },
  { id: "nogal", nombre: "Nogal", base: "#7a5337", veta: "#523521", rugosidad: 0.55 },
  { id: "wengue", nombre: "Wengué", base: "#43302a", veta: "#271a15", rugosidad: 0.6 },
];

export const JALADERAS: AcabadoMetal[] = [
  { id: "acero", nombre: "Acero", color: "#c9cbcf", metal: 1, rugosidad: 0.28 },
  { id: "negro", nombre: "Negro mate", color: "#202022", metal: 0.4, rugosidad: 0.6 },
  { id: "dorado", nombre: "Dorado", color: "#c9a25a", metal: 1, rugosidad: 0.3 },
  { id: "cobre", nombre: "Cobre", color: "#b87350", metal: 1, rugosidad: 0.35 },
];

export interface AcabadosItem {
  cuerpo: string;
  frente: string;
  jaladera: string;
}

export const ACABADOS_DEFECTO: AcabadosItem = { cuerpo: "blanco", frente: "roble", jaladera: "negro" };

/** Color libre elegido con "Otro color" (se guarda como "#rrggbb"). */
export const esColorLibre = (id: string) => /^#[0-9a-f]{6}$/i.test(id);

export const acabado = (id: string): Acabado =>
  ACABADOS.find((a) => a.id === id) ?? (esColorLibre(id) ? { id, nombre: "Otro color", base: id, rugosidad: 0.5 } : ACABADOS[0]);
export const jaladera = (id: string) => JALADERAS.find((a) => a.id === id) ?? JALADERAS[0];

/** Fondo CSS para las muestras del selector. */
export function muestraCss(a: Acabado) {
  if (!a.veta) return a.base;
  return `repeating-linear-gradient(100deg, ${a.base} 0 6px, ${a.veta} 6px 7px, ${a.base} 7px 13px, ${a.veta}88 13px 15px)`;
}
