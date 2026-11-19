import type { Configuracion } from "./tipos";
import type { Precios } from "./proyecto";

// Valores iniciales de referencia (Colombia, pesos). Cada carpintero los cambia en "Mis precios".
export const CONFIG_DEFECTO: Configuracion = {
  materiales: {
    cuerpo: { clave: "cuerpo", nombre: "Melamina 18 mm (cuerpo)", espesor: 18, largoLamina: 2440, anchoLamina: 1830, precioLamina: 230000, veta: false },
    frente: { clave: "frente", nombre: "Melamina 18 mm (frentes)", espesor: 18, largoLamina: 2440, anchoLamina: 1830, precioLamina: 260000, veta: false },
    interior: { clave: "interior", nombre: "Melamina blanca 18 mm (interior)", espesor: 18, largoLamina: 2440, anchoLamina: 1830, precioLamina: 195000, veta: false },
    fondo: { clave: "fondo", nombre: "HDF 3 mm (fondos)", espesor: 3, largoLamina: 2440, anchoLamina: 1830, precioLamina: 48000, veta: false },
  },
  espesorCanto: 0.45,
  holgura: 3,
  sierra: 4,
  refilado: 10,
};

export const PRECIOS_DEFECTO: Precios = {
  simbolo: "$",
  decimales: 0,
  cantoPorMetro: 1200,
  servicioCortePorLamina: 12000,
  canteadoPorMetro: 1500,
  herrajes: {
    bisagra: 4500,
    corredera: 18000,
    jaladera: 6000,
    tornillo: 100,
    tornillo_corto: 50,
    soporte_entrepano: 150,
    pata_niveladora: 3500,
    tubo_colgador: 12000,
    soporte_tubo: 2000,
    clavo_fondo: 20,
    colgador_mueble: 6000,
    led_cinta: 28000,
    led_fuente: 35000,
    led_sensor: 18000,
    rodachina: 7000,
  },
  manoObraPorcentaje: 40,
  otrosCostos: 0,
  margenPorcentaje: 30,
  impuestoPorcentaje: 0,
  cobroLaminas: "proporcional",
  desperdicioPorcentaje: 15,
};

export const NOMBRES_PRECIO_HERRAJE: Record<string, string> = {
  bisagra: "Bisagra cazoleta 35 mm (u)",
  corredera: "Corredera telescópica (par)",
  jaladera: "Jaladera / manija (u)",
  tornillo: "Tornillo 4×50 (u)",
  tornillo_corto: "Tornillo 4×16 (u)",
  soporte_entrepano: "Soporte de entrepaño (u)",
  pata_niveladora: "Pata niveladora (u)",
  tubo_colgador: "Tubo colgador (m)",
  soporte_tubo: "Soporte de tubo (u)",
  clavo_fondo: "Grapa / clavo de fondo (u)",
  colgador_mueble: "Colgador de mueble aéreo (u)",
  led_cinta: "Cinta LED con perfil de aluminio (m)",
  led_fuente: "Fuente LED 12 V (u)",
  led_sensor: "Sensor o interruptor LED (u)",
  rodachina: "Rodachina giratoria 2\" (u)",
};
