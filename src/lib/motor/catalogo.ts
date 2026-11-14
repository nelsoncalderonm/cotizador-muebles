// Catálogo de muebles paramétricos. Cada mueble es una función: medidas → piezas, herrajes, vista y pasos.
// Para agregar un mueble nuevo, crea una DefinicionMueble y agrégala a CATALOGO.

import { Constructor, CANTO_CUATRO, CANTO_UN_LARGO, bool, num, str } from "./constructor";
import type { DefinicionMueble } from "./tipos";

const librero: DefinicionMueble = {
  id: "librero",
  nombre: "Librero / repisa",
  categoria: "Sala y oficina",
  descripcion: "Repisa abierta con entrepaños móviles y divisiones verticales opcionales.",
  parametros: [
    { clave: "ancho", etiqueta: "Ancho", tipo: "medida", min: 300, max: 2400, defecto: 800 },
    { clave: "alto", etiqueta: "Alto", tipo: "medida", min: 300, max: 2400, defecto: 1800 },
    { clave: "fondo", etiqueta: "Fondo", tipo: "medida", min: 150, max: 600, defecto: 300 },
    { clave: "columnas", etiqueta: "Columnas (divisiones)", tipo: "entero", min: 1, max: 5, defecto: 1 },
    { clave: "entrepanos", etiqueta: "Entrepaños por columna", tipo: "entero", min: 0, max: 12, defecto: 4 },
    { clave: "zocalo", etiqueta: "Alto del zócalo", tipo: "medida", min: 0, max: 150, defecto: 60, ayuda: "0 = sin zócalo" },
    { clave: "conFondo", etiqueta: "Con fondo trasero", tipo: "si_no", defecto: true },
  ],
  generar(p, cfg) {
    const c = new Constructor(cfg);
    const A = num(p.ancho, 800), H = num(p.alto, 1800), F = num(p.fondo, 300);
    const cols = Math.max(1, Math.round(num(p.columnas, 1)));
    const n = Math.round(num(p.entrepanos, 4));
    const conFondo = bool(p.conFondo, true);
    const { ai, fi, e, yIni, altoHueco, piezasCaja } = c.caja({ A, H, F, conFondo, zocalo: num(p.zocalo, 60) });
    const anchoHueco = (ai - (cols - 1) * e) / cols;
    if (cols > 1) {
      c.pieza("division", "División vertical", altoHueco, fi, cols - 1, "cuerpo", CANTO_UN_LARGO);
      c.herraje("tornillo", (cols - 1) * 2 * 3);
    }
    for (let i = 0; i < cols; i++) {
      const x = e + i * (anchoHueco + e);
      if (i > 0) c.rect("division", x - e, yIni, e, altoHueco);
      c.entrepanos("entrepano", n, x, yIni, anchoHueco, altoHueco, fi - 20);
    }
    if (anchoHueco > 900) c.advertencias.push(`Los entrepaños miden ${Math.round(anchoHueco)} mm: con más de 900 mm se pandean. Agrega una columna.`);
    c.cota(0, H, A, H, 80);
    c.cota(A, H, A, 0, 80);
    c.paso("Armar la caja", "Une piso y techo a los laterales con 3 tornillos por unión. Pre-taladra con broca de 3 mm para no rajar el tablero.", piezasCaja.filter((x) => x !== "zocalo"), ["tornillo"]);
    if (piezasCaja.includes("zocalo")) c.paso("Colocar el zócalo", "Atornilla el zócalo al frente, debajo del piso, a ras con los laterales.", ["zocalo"]);
    if (cols > 1) c.paso("Colocar divisiones", `Reparte ${cols - 1} división(es) a ${Math.round(anchoHueco)} mm libres entre caras. Atornilla desde arriba y desde abajo.`, ["division"]);
    if (conFondo) c.paso("Clavar el fondo", "Antes de clavar, mide las diagonales: deben ser iguales para que el mueble quede a escuadra.", ["fondo"], ["clavo_fondo"]);
    if (n > 0) c.paso("Poner entrepaños", "Perfora para los soportes cada 32 mm o a la altura indicada y apoya los entrepaños.", ["entrepano"], ["soporte_entrepano"]);
    return c.resultado(A, H);
  },
};

const bajoCocina: DefinicionMueble = {
  id: "bajo_cocina",
  nombre: "Mueble bajo de cocina",
  categoria: "Cocina",
  descripcion: "Módulo inferior sobre patas niveladoras, con puertas, cajones o combinado.",
  parametros: [
    { clave: "ancho", etiqueta: "Ancho", tipo: "medida", min: 200, max: 1200, defecto: 600 },
    { clave: "alto", etiqueta: "Alto del cuerpo", tipo: "medida", min: 500, max: 900, defecto: 720, ayuda: "Sin patas ni mesón" },
    { clave: "fondo", etiqueta: "Fondo", tipo: "medida", min: 300, max: 650, defecto: 560 },
    { clave: "patas", etiqueta: "Alto de patas", tipo: "medida", min: 0, max: 200, defecto: 100 },
    {
      clave: "frente",
      etiqueta: "Tipo de frente",
      tipo: "opcion",
      defecto: "puertas",
      opciones: [
        { valor: "puertas", etiqueta: "Puertas" },
        { valor: "cajones", etiqueta: "Cajones" },
        { valor: "mixto", etiqueta: "1 cajón + puertas" },
      ],
    },
    { clave: "puertas", etiqueta: "Número de puertas", tipo: "entero", min: 1, max: 2, defecto: 2 },
    { clave: "cajones", etiqueta: "Número de cajones", tipo: "entero", min: 1, max: 5, defecto: 3 },
    { clave: "entrepano", etiqueta: "Entrepaño interior", tipo: "si_no", defecto: true },
  ],
  generar(p, cfg) {
    const c = new Constructor(cfg);
    const A = num(p.ancho, 600), H = num(p.alto, 720), F = num(p.fondo, 560), P = num(p.patas, 100);
    const frente = str(p.frente, "puertas");
    const { ai, fi, e, yIni, altoHueco, piezasCaja } = c.caja({ A, H, F, yBase: P, superior: "travesanos" });
    if (P > 0) {
      c.herraje("pata_niveladora", A > 900 ? 6 : 4);
      c.rect("pata", 40, 0, 40, P, "detalle");
      c.rect("pata", A - 80, 0, 40, P, "detalle");
    }
    const altoCajonMixto = 180;
    const conEntrepano = bool(p.entrepano, true) && frente !== "cajones";
    if (conEntrepano) {
      const altoLibre = frente === "mixto" ? altoHueco - altoCajonMixto : altoHueco;
      c.entrepanos("entrepano", 1, e, yIni, ai, altoLibre, fi - 20);
    }
    if (frente === "puertas") c.puertas("puerta", num(p.puertas, 2), 0, P, A, H);
    if (frente === "cajones") c.cajones("cajon", num(p.cajones, 3), ai, fi, 0, P, A, H);
    if (frente === "mixto") {
      c.cajones("cajon", 1, ai, fi, 0, P + H - altoCajonMixto, A, altoCajonMixto);
      c.puertas("puerta", num(p.puertas, 2), 0, P, A, H - altoCajonMixto);
    }
    c.cota(0, P + H, A, P + H, 80);
    c.cota(A, P + H, A, 0, 80, `${Math.round(P + H)}`);
    c.paso("Armar la caja", "Atornilla el piso entre los laterales y luego los dos travesaños superiores (uno al frente y otro atrás).", piezasCaja, ["tornillo"]);
    c.paso("Clavar el fondo", "Verifica escuadra midiendo diagonales y clava el fondo.", ["fondo"], ["clavo_fondo"]);
    if (P > 0) c.paso("Instalar patas", "Atornilla las patas niveladoras al piso, a 40 mm de cada borde.", ["pata"], ["pata_niveladora"]);
    if (frente !== "puertas") c.paso("Instalar cajones", "Arma las cajas de cajón, fija las correderas a los laterales y luego atornilla el frente desde adentro.", ["cajon_frente"]);
    if (frente !== "cajones") c.paso("Colgar puertas", "Perfora la cazoleta de 35 mm a 22 mm del borde, instala bisagras y regula las puertas.", ["puerta"], ["bisagra"]);
    if (conEntrepano) c.paso("Colocar entrepaño", "Apoya el entrepaño sobre los soportes.", ["entrepano"]);
    return c.resultado(A, P + H);
  },
};

const aereoCocina: DefinicionMueble = {
  id: "aereo_cocina",
  nombre: "Mueble aéreo de cocina",
  categoria: "Cocina",
  descripcion: "Módulo superior colgado con puertas abatibles y entrepaños.",
  parametros: [
    { clave: "ancho", etiqueta: "Ancho", tipo: "medida", min: 200, max: 1200, defecto: 800 },
    { clave: "alto", etiqueta: "Alto", tipo: "medida", min: 300, max: 1000, defecto: 700 },
    { clave: "fondo", etiqueta: "Fondo", tipo: "medida", min: 200, max: 450, defecto: 320 },
    { clave: "puertas", etiqueta: "Número de puertas", tipo: "entero", min: 0, max: 3, defecto: 2, ayuda: "0 = abierto" },
    { clave: "entrepanos", etiqueta: "Entrepaños", tipo: "entero", min: 0, max: 4, defecto: 1 },
  ],
  generar(p, cfg) {
    const c = new Constructor(cfg);
    const A = num(p.ancho, 800), H = num(p.alto, 700), F = num(p.fondo, 320);
    const { ai, fi, e, yIni, altoHueco, piezasCaja } = c.caja({ A, H, F });
    const n = num(p.entrepanos, 1);
    c.entrepanos("entrepano", n, e, yIni, ai, altoHueco, fi - 20);
    c.herraje("colgador_mueble", 2);
    const np = num(p.puertas, 2);
    c.puertas("puerta", np, 0, 0, A, H);
    c.cota(0, H, A, H, 80);
    c.cota(A, H, A, 0, 80);
    c.paso("Armar la caja", "Une piso y techo a los laterales con 3 tornillos por unión.", piezasCaja, ["tornillo"]);
    c.paso("Clavar el fondo", "Verifica escuadra y clava el fondo. Instala los colgadores en las esquinas superiores.", ["fondo"], ["clavo_fondo", "colgador_mueble"]);
    if (n > 0) c.paso("Colocar entrepaños", "Apoya los entrepaños sobre los soportes.", ["entrepano"], ["soporte_entrepano"]);
    if (np > 0) c.paso("Colgar puertas", "Instala las bisagras de cazoleta y regula las puertas.", ["puerta"], ["bisagra"]);
    return c.resultado(A, H);
  },
};

const escritorio: DefinicionMueble = {
  id: "escritorio",
  nombre: "Escritorio",
  categoria: "Sala y oficina",
  descripcion: "Escritorio con faldón trasero y cajonera lateral opcional.",
  parametros: [
    { clave: "ancho", etiqueta: "Ancho", tipo: "medida", min: 700, max: 2000, defecto: 1200 },
    { clave: "alto", etiqueta: "Alto", tipo: "medida", min: 650, max: 800, defecto: 750 },
    { clave: "fondo", etiqueta: "Fondo", tipo: "medida", min: 400, max: 800, defecto: 600 },
    { clave: "faldon", etiqueta: "Alto del faldón", tipo: "medida", min: 0, max: 500, defecto: 300, ayuda: "0 = sin faldón" },
    { clave: "cajonera", etiqueta: "Con cajonera", tipo: "si_no", defecto: true },
    { clave: "anchoCajonera", etiqueta: "Ancho de cajonera", tipo: "medida", min: 300, max: 600, defecto: 400 },
    { clave: "cajones", etiqueta: "Cajones", tipo: "entero", min: 1, max: 4, defecto: 3 },
  ],
  generar(p, cfg) {
    const c = new Constructor(cfg);
    const e = c.e;
    const A = num(p.ancho, 1200), H = num(p.alto, 750), F = num(p.fondo, 600);
    const faldon = num(p.faldon, 300);
    const conCajonera = bool(p.cajonera, true);
    const cw = num(p.anchoCajonera, 400);
    c.pieza("cubierta", "Cubierta", A, F, 1, "frente", CANTO_CUATRO);
    c.rect("cubierta", 0, H - e, A, e);
    c.pieza("lateral", "Lateral (pata)", H - e, F, 2, "cuerpo", { largo1: true, largo2: true, ancho1: false, ancho2: false });
    c.rect("lateral", 0, 0, e, H - e);
    c.rect("lateral", A - e, 0, e, H - e);
    c.herraje("tornillo", 2 * 4);
    const piezasEstructura = ["cubierta", "lateral"];
    if (faldon > 0) {
      c.pieza("faldon", "Faldón trasero", A - 2 * e, faldon, 1, "cuerpo", CANTO_UN_LARGO);
      c.rect("faldon", e, H - e - faldon, A - 2 * e, faldon, "detalle");
      c.herraje("tornillo", 2 * 3 + 4);
      piezasEstructura.push("faldon");
    }
    c.cota(0, H, A, H, 80);
    c.cota(A, H, A, 0, 80);
    c.paso("Unir patas y cubierta", "Atornilla los laterales a la cubierta desde abajo (o con minifix). Deja la cubierta boca abajo sobre una manta para trabajar.", ["cubierta", "lateral"], ["tornillo"]);
    if (faldon > 0) c.paso("Colocar el faldón", "Atornilla el faldón entre los laterales, a ras de la parte trasera; le da rigidez al escritorio.", ["faldon"]);
    if (conCajonera) {
      const zc = 60;
      const xDiv = A - e - cw - e;
      c.pieza("lateral_cajonera", "Lateral interior de cajonera", H - e, F - 20, 1, "cuerpo", CANTO_UN_LARGO);
      c.rect("lateral_cajonera", xDiv, 0, e, H - e);
      c.pieza("piso_cajonera", "Piso de cajonera", cw, F - 20, 1, "cuerpo", CANTO_UN_LARGO);
      c.rect("piso_cajonera", xDiv + e, zc, cw, e);
      c.pieza("zocalo_cajonera", "Zócalo de cajonera", cw, zc, 1, "cuerpo", CANTO_UN_LARGO);
      c.rect("zocalo_cajonera", xDiv + e, 0, cw, zc);
      c.herraje("tornillo", 4 * 3 + 6);
      c.cajones("cajon", num(p.cajones, 3), cw, F - 20, xDiv + e, zc + e, cw, H - e - zc - e);
      c.paso("Armar la cajonera", "Atornilla el lateral interior a la cubierta, luego el piso y el zócalo de la cajonera.", ["lateral_cajonera", "piso_cajonera", "zocalo_cajonera"]);
      c.paso("Instalar cajones", "Arma las cajas, instala las correderas y atornilla los frentes dejando la holgura pareja.", ["cajon_frente"]);
    }
    return c.resultado(A, H);
  },
};

const closet: DefinicionMueble = {
  id: "closet",
  nombre: "Closet / ropero",
  categoria: "Dormitorio",
  descripcion: "Ropero por cuerpos con maletero, tubo colgador y puertas abatibles.",
  parametros: [
    { clave: "ancho", etiqueta: "Ancho", tipo: "medida", min: 500, max: 3000, defecto: 1500 },
    { clave: "alto", etiqueta: "Alto", tipo: "medida", min: 1200, max: 2440, defecto: 2100 },
    { clave: "fondo", etiqueta: "Fondo", tipo: "medida", min: 400, max: 650, defecto: 550 },
    { clave: "cuerpos", etiqueta: "Cuerpos", tipo: "entero", min: 1, max: 5, defecto: 2 },
    { clave: "maletero", etiqueta: "Altura del maletero", tipo: "medida", min: 0, max: 700, defecto: 400, ayuda: "0 = sin maletero" },
    { clave: "tubo", etiqueta: "Tubo colgador", tipo: "si_no", defecto: true },
    { clave: "puertas", etiqueta: "Con puertas", tipo: "si_no", defecto: true },
    { clave: "zocalo", etiqueta: "Alto del zócalo", tipo: "medida", min: 0, max: 150, defecto: 80 },
  ],
  generar(p, cfg) {
    const c = new Constructor(cfg);
    const A = num(p.ancho, 1500), H = num(p.alto, 2100), F = num(p.fondo, 550);
    const cuerpos = Math.max(1, Math.round(num(p.cuerpos, 2)));
    const maletero = num(p.maletero, 400);
    const { ai, fi, e, yIni, altoHueco, piezasCaja } = c.caja({ A, H, F, zocalo: num(p.zocalo, 80) });
    const anchoHueco = (ai - (cuerpos - 1) * e) / cuerpos;
    if (cuerpos > 1) {
      c.pieza("division", "División vertical", altoHueco, fi, cuerpos - 1, "cuerpo", CANTO_UN_LARGO);
      c.herraje("tornillo", (cuerpos - 1) * 2 * 3);
    }
    for (let i = 0; i < cuerpos; i++) {
      const x = e + i * (anchoHueco + e);
      if (i > 0) c.rect("division", x - e, yIni, e, altoHueco);
      if (maletero > 0) {
        c.pieza("maletero", "Entrepaño de maletero (fijo)", anchoHueco, fi - 20, 1, "cuerpo", CANTO_UN_LARGO);
        c.rect("maletero", x, yIni + altoHueco - maletero - e, anchoHueco, e);
        c.herraje("tornillo", 4);
      }
      if (bool(p.tubo, true)) {
        c.herraje("tubo_colgador", Math.round(anchoHueco) / 1000);
        c.herraje("soporte_tubo", 2);
        const yT = yIni + altoHueco - (maletero > 0 ? maletero + e : 0) - 60;
        c.rect("tubo", x + 10, yT, anchoHueco - 20, 15, "detalle");
      }
    }
    if (anchoHueco > 1000) c.advertencias.push(`Cada cuerpo mide ${Math.round(anchoHueco)} mm; el tubo y el maletero se pandean sobre 1000 mm. Agrega un cuerpo.`);
    const puertasPorCuerpo = anchoHueco > 600 ? 2 : 1;
    const conPuertas = bool(p.puertas, true);
    const z = num(p.zocalo, 80);
    if (conPuertas) c.puertas("puerta", cuerpos * puertasPorCuerpo, 0, z, A, H - z);
    c.cota(0, H, A, H, 80);
    c.cota(A, H, A, 0, 80);
    c.paso("Armar la caja", "Arma el closet acostado en el piso: une techo y piso a los laterales con 3 tornillos por unión. Pide ayuda: es pesado.", piezasCaja.filter((x) => x !== "zocalo"), ["tornillo"]);
    if (z > 0) c.paso("Colocar el zócalo", "Atornilla el zócalo al frente, debajo del piso.", ["zocalo"]);
    if (cuerpos > 1) c.paso("Colocar divisiones", `Reparte las divisiones dejando ${Math.round(anchoHueco)} mm libres por cuerpo.`, ["division"]);
    c.paso("Clavar el fondo", "Con el mueble acostado, mide diagonales y clava el fondo. Si va en partes, une las juntas sobre una división.", ["fondo"], ["clavo_fondo"]);
    if (maletero > 0) c.paso("Fijar maleteros", `Atornilla el entrepaño fijo a ${maletero} mm bajo el techo.`, ["maletero"]);
    if (bool(p.tubo, true)) c.paso("Instalar tubos", "Fija los soportes 60 mm bajo el maletero y coloca el tubo cortado a la medida del hueco.", ["tubo"], ["tubo_colgador"]);
    if (conPuertas) c.paso("Colgar puertas", "Levanta el closet, nivélalo y luego instala bisagras y puertas.", ["puerta"], ["bisagra"]);
    return c.resultado(A, H);
  },
};

function cajoneraGenerica(id: string, nombre: string, categoria: string, descripcion: string, d: { A: number; H: number; F: number; n: number }): DefinicionMueble {
  return {
    id,
    nombre,
    categoria,
    descripcion,
    parametros: [
      { clave: "ancho", etiqueta: "Ancho", tipo: "medida", min: 300, max: 1200, defecto: d.A },
      { clave: "alto", etiqueta: "Alto", tipo: "medida", min: 300, max: 1400, defecto: d.H },
      { clave: "fondo", etiqueta: "Fondo", tipo: "medida", min: 300, max: 650, defecto: d.F },
      { clave: "cajones", etiqueta: "Cajones", tipo: "entero", min: 1, max: 8, defecto: d.n },
      { clave: "zocalo", etiqueta: "Alto del zócalo", tipo: "medida", min: 0, max: 150, defecto: 60 },
    ],
    generar(p, cfg) {
      const c = new Constructor(cfg);
      const A = num(p.ancho, d.A), H = num(p.alto, d.H), F = num(p.fondo, d.F), z = num(p.zocalo, 60);
      const { ai, fi, piezasCaja } = c.caja({ A, H, F, zocalo: z });
      c.cajones("cajon", num(p.cajones, d.n), ai, fi, 0, z, A, H - z);
      c.cota(0, H, A, H, 80);
      c.cota(A, H, A, 0, 80);
      c.paso("Armar la caja", "Une piso y techo a los laterales con 3 tornillos por unión.", piezasCaja.filter((x) => x !== "zocalo"), ["tornillo"]);
      if (z > 0) c.paso("Colocar el zócalo", "Atornilla el zócalo al frente, debajo del piso.", ["zocalo"]);
      c.paso("Clavar el fondo", "Mide diagonales para verificar escuadra y clava el fondo.", ["fondo"], ["clavo_fondo"]);
      c.paso("Instalar cajones", "Arma las cajas de cajón, instala las correderas a la misma altura en ambos lados y atornilla los frentes.", ["cajon_frente"]);
      return c.resultado(A, H);
    },
  };
}

const mesaNoche = cajoneraGenerica("mesa_noche", "Mesa de noche", "Dormitorio", "Mesa de noche con cajones.", { A: 450, H: 550, F: 400, n: 2 });
const cajonera = cajoneraGenerica("cajonera", "Cajonera / cómoda", "Dormitorio", "Cómoda de cajones con zócalo.", { A: 800, H: 900, F: 450, n: 4 });

export const CATALOGO: DefinicionMueble[] = [bajoCocina, aereoCocina, closet, librero, escritorio, mesaNoche, cajonera];

export function buscarMueble(id: string) {
  return CATALOGO.find((m) => m.id === id);
}

export function valoresPorDefecto(def: DefinicionMueble) {
  return Object.fromEntries(def.parametros.map((p) => [p.clave, p.defecto]));
}
