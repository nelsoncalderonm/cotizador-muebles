// Tipos base del motor paramétrico. Todas las medidas en milímetros.

export type ClaveMaterial = "cuerpo" | "frente" | "fondo";

export interface Material {
  clave: ClaveMaterial;
  nombre: string;
  espesor: number;
  largoLamina: number; // sentido de la veta
  anchoLamina: number;
  precioLamina: number;
  veta: boolean; // si es true, las piezas no se rotan al optimizar
}

export interface Cantos {
  // true = la arista lleva canto. "largo" son las dos aristas largas, "ancho" las cortas.
  largo1: boolean;
  largo2: boolean;
  ancho1: boolean;
  ancho2: boolean;
}

export interface Pieza {
  id: string; // único dentro del mueble, p. ej. "lateral"
  nombre: string;
  largo: number; // medida terminada, en sentido de la veta
  ancho: number; // medida terminada
  cantidad: number;
  material: ClaveMaterial;
  cantos: Cantos;
  nota?: string;
}

export interface Herraje {
  clave: string;
  nombre: string;
  cantidad: number;
  unidad: string; // "u", "m", "par"
}

/** Rectángulo de la vista frontal (origen abajo-izquierda, en mm). */
export interface RectVista {
  piezaId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tipo: "estructura" | "frente" | "detalle";
  etiqueta?: string;
}

export interface Cota {
  // línea de cota en la vista frontal
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  texto: string;
  desplazamiento: number; // separación de la cota respecto al objeto (mm, puede ser negativa)
}

export interface PasoArmado {
  titulo: string;
  descripcion: string;
  piezas: string[]; // ids de piezas que se agregan en este paso
  herrajes?: string[];
}

export interface ResultadoMueble {
  piezas: Pieza[];
  herrajes: Herraje[];
  vista: { ancho: number; alto: number; rects: RectVista[]; cotas: Cota[] };
  pasos: PasoArmado[];
  advertencias: string[];
}

export type Parametro =
  | {
      clave: string;
      etiqueta: string;
      tipo: "medida";
      min: number;
      max: number;
      defecto: number;
      ayuda?: string;
    }
  | {
      clave: string;
      etiqueta: string;
      tipo: "entero";
      min: number;
      max: number;
      defecto: number;
      ayuda?: string;
    }
  | { clave: string; etiqueta: string; tipo: "si_no"; defecto: boolean; ayuda?: string }
  | {
      clave: string;
      etiqueta: string;
      tipo: "opcion";
      opciones: { valor: string; etiqueta: string }[];
      defecto: string;
      ayuda?: string;
    };

export type ValoresParametros = Record<string, number | boolean | string>;

export interface Configuracion {
  materiales: Record<ClaveMaterial, Material>;
  espesorCanto: number; // mm que se descuentan por cada arista con canto
  holgura: number; // separación entre frentes (mm)
  sierra: number; // grosor de la sierra (mm)
  refilado: number; // mm que se recortan en cada borde de la lámina
}

export interface DefinicionMueble {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  parametros: Parametro[];
  generar: (p: ValoresParametros, c: Configuracion) => ResultadoMueble;
}
