// Valores de referencia por país para la configuración inicial: moneda, tamaño de lámina habitual e impuesto.
// Los precios parten de los de Colombia convertidos con un factor aproximado; cada taller los ajusta después.

import { CONFIG_DEFECTO, PRECIOS_DEFECTO } from "./motor/defaults";
import type { Precios } from "./motor/proyecto";
import type { Configuracion } from "./motor/tipos";

export interface Pais {
  id: string;
  nombre: string;
  bandera: string;
  simbolo: string;
  decimales: number;
  /** Unidades de la moneda local por cada peso colombiano (aproximado, solo para dar precios de partida). */
  factor: number;
  /** Lámina más común [largo, ancho] en mm. */
  lamina: [number, number];
  impuesto: number;
}

export const PAISES: Pais[] = [
  { id: "co", nombre: "Colombia", bandera: "🇨🇴", simbolo: "$", decimales: 0, factor: 1, lamina: [2440, 1830], impuesto: 0 },
  { id: "mx", nombre: "México", bandera: "🇲🇽", simbolo: "$", decimales: 0, factor: 1 / 220, lamina: [2440, 1220], impuesto: 0 },
  { id: "pe", nombre: "Perú", bandera: "🇵🇪", simbolo: "S/", decimales: 0, factor: 1 / 1100, lamina: [2440, 2150], impuesto: 0 },
  { id: "cl", nombre: "Chile", bandera: "🇨🇱", simbolo: "$", decimales: 0, factor: 1 / 4.3, lamina: [2500, 1830], impuesto: 0 },
  { id: "ar", nombre: "Argentina", bandera: "🇦🇷", simbolo: "$", decimales: 0, factor: 1 / 3, lamina: [2750, 1830], impuesto: 0 },
  { id: "ec", nombre: "Ecuador", bandera: "🇪🇨", simbolo: "US$", decimales: 2, factor: 1 / 4000, lamina: [2440, 2150], impuesto: 0 },
  { id: "bo", nombre: "Bolivia", bandera: "🇧🇴", simbolo: "Bs", decimales: 0, factor: 1 / 580, lamina: [2440, 1830], impuesto: 0 },
  { id: "py", nombre: "Paraguay", bandera: "🇵🇾", simbolo: "₲", decimales: 0, factor: 1.8, lamina: [2750, 1830], impuesto: 0 },
  { id: "uy", nombre: "Uruguay", bandera: "🇺🇾", simbolo: "$", decimales: 0, factor: 1 / 100, lamina: [2750, 1830], impuesto: 0 },
  { id: "ve", nombre: "Venezuela", bandera: "🇻🇪", simbolo: "US$", decimales: 2, factor: 1 / 4000, lamina: [2440, 1830], impuesto: 0 },
  { id: "gt", nombre: "Guatemala", bandera: "🇬🇹", simbolo: "Q", decimales: 0, factor: 1 / 520, lamina: [2440, 1220], impuesto: 0 },
  { id: "cr", nombre: "Costa Rica", bandera: "🇨🇷", simbolo: "₡", decimales: 0, factor: 1 / 8, lamina: [2440, 1220], impuesto: 0 },
  { id: "do", nombre: "Rep. Dominicana", bandera: "🇩🇴", simbolo: "RD$", decimales: 0, factor: 1 / 68, lamina: [2440, 1220], impuesto: 0 },
  { id: "hn", nombre: "Honduras", bandera: "🇭🇳", simbolo: "L", decimales: 0, factor: 1 / 160, lamina: [2440, 1220], impuesto: 0 },
  { id: "sv", nombre: "El Salvador", bandera: "🇸🇻", simbolo: "US$", decimales: 2, factor: 1 / 4000, lamina: [2440, 1220], impuesto: 0 },
  { id: "pa", nombre: "Panamá", bandera: "🇵🇦", simbolo: "US$", decimales: 2, factor: 1 / 4000, lamina: [2440, 1220], impuesto: 0 },
  { id: "otro", nombre: "Otro país", bandera: "🌎", simbolo: "$", decimales: 2, factor: 1 / 4000, lamina: [2440, 1220], impuesto: 0 },
];

export const LAMINAS_COMUNES: [number, number][] = [
  [2440, 1830],
  [2440, 1220],
  [2440, 2150],
  [2500, 1830],
  [2750, 1830],
];

/** Redondea a 2 cifras significativas (o a centavos si la moneda usa decimales) para que el precio se vea natural. */
function redondo(n: number, decimales: number) {
  if (n <= 0) return 0;
  if (decimales > 0 && n < 100) return Math.round(n * 100) / 100;
  const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1));
  return Math.round(n / p) * p;
}

/** Precios y tableros de partida para un país. */
export function referenciaPais(p: Pais): { config: Configuracion; precios: Precios } {
  const c = (n: number) => redondo(n * p.factor, p.decimales);
  const base = CONFIG_DEFECTO.materiales;
  const mat = <K extends keyof typeof base>(k: K) => ({ ...base[k], largoLamina: p.lamina[0], anchoLamina: p.lamina[1], precioLamina: c((base[k].precioLamina * (p.lamina[0] * p.lamina[1])) / (2440 * 1830)) });
  return {
    config: { ...CONFIG_DEFECTO, materiales: { cuerpo: mat("cuerpo"), frente: mat("frente"), fondo: mat("fondo") } },
    precios: {
      ...PRECIOS_DEFECTO,
      simbolo: p.simbolo,
      decimales: p.decimales,
      impuestoPorcentaje: p.impuesto,
      cantoPorMetro: c(PRECIOS_DEFECTO.cantoPorMetro),
      servicioCortePorLamina: c(PRECIOS_DEFECTO.servicioCortePorLamina),
      canteadoPorMetro: c(PRECIOS_DEFECTO.canteadoPorMetro),
      herrajes: Object.fromEntries(Object.entries(PRECIOS_DEFECTO.herrajes).map(([k, v]) => [k, c(v)])),
    },
  };
}
