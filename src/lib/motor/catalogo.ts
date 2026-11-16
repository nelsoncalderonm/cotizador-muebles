// Catálogo de muebles paramétricos. Cada mueble es una función: medidas → piezas, herrajes, vista y pasos.
// Para agregar un mueble nuevo, crea una DefinicionMueble y agrégala a CATALOGO.

import { Constructor, CANTO_CUATRO, CANTO_UN_LARGO, bool, num, str } from "./constructor";
import type { DefinicionMueble } from "./tipos";
import { conExtras } from "./extras";

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
    { clave: "puertasAbajo", etiqueta: "Alto de puertas abajo", tipo: "medida", min: 0, max: 1200, defecto: 0, ayuda: "0 = sin puertas; ej. 800 para biblioteca con gabinete" },
  ],
  generar(p, cfg) {
    const c = new Constructor(cfg);
    const A = num(p.ancho, 800), H = num(p.alto, 1800), F = num(p.fondo, 300);
    const alturaPuertas = num(p.puertasAbajo, 0);
    const cols = Math.max(1, Math.round(num(p.columnas, 1)));
    const n = Math.round(num(p.entrepanos, 4));
    const conFondo = bool(p.conFondo, true);
    const { ai, fi, e, yIni, altoHueco, piezasCaja } = c.caja({ A, H, F, conFondo, zocalo: num(p.zocalo, 60) });
    const anchoHueco = (ai - (cols - 1) * e) / cols;
    if (cols > 1) {
      c.pieza("division", "División vertical", altoHueco, fi, cols - 1, "cuerpo", CANTO_UN_LARGO);
      c.herraje("tornillo", (cols - 1) * 2 * 3);
    }
    const conPuertas = alturaPuertas > 0 && alturaPuertas < altoHueco - 200;
    const yFijo = yIni + alturaPuertas - num(p.zocalo, 60) - e;
    for (let i = 0; i < cols; i++) {
      const x = e + i * (anchoHueco + e);
      if (i > 0) c.rect("division", x - e, yIni, e, altoHueco);
      if (conPuertas) {
        c.pieza("fijo", "Entrepaño fijo (sobre puertas)", anchoHueco, fi, 1, "cuerpo", CANTO_UN_LARGO);
        c.rect("fijo", x, yFijo, anchoHueco, e);
        c.herraje("tornillo", 4);
        c.entrepanos("entrepano_bajo", 1, x, yIni, anchoHueco, yFijo - yIni, fi - 20);
        c.entrepanos("entrepano", n, x, yFijo + e, anchoHueco, yIni + altoHueco - yFijo - e, fi - 20);
      } else c.entrepanos("entrepano", n, x, yIni, anchoHueco, altoHueco, fi - 20);
    }
    if (conPuertas) c.puertas("puerta", cols * (anchoHueco > 600 ? 2 : 1), 0, 0, A, yFijo + e);
    if (anchoHueco > 900) c.advertencias.push(`Los entrepaños miden ${Math.round(anchoHueco)} mm: con más de 900 mm se pandean. Agrega una columna.`);
    c.cota(0, H, A, H, 80);
    c.cota(A, H, A, 0, 80);
    c.paso("Armar la caja", "Une piso y techo a los laterales con 3 tornillos por unión. Pre-taladra con broca de 3 mm para no rajar el tablero.", piezasCaja.filter((x) => x !== "zocalo"), ["tornillo"]);
    if (piezasCaja.includes("zocalo")) c.paso("Colocar el zócalo", "Atornilla el zócalo al frente, debajo del piso, a ras con los laterales.", ["zocalo"]);
    if (cols > 1) c.paso("Colocar divisiones", `Reparte ${cols - 1} división(es) a ${Math.round(anchoHueco)} mm libres entre caras. Atornilla desde arriba y desde abajo.`, ["division"]);
    if (conFondo) c.paso("Clavar el fondo", "Antes de clavar, mide las diagonales: deben ser iguales para que el mueble quede a escuadra.", ["fondo"], ["clavo_fondo"]);
    if (conPuertas) c.paso("Fijar entrepaño sobre puertas", `Atornilla el entrepaño fijo a ${Math.round(yFijo)} mm del piso: es el techo del gabinete.`, ["fijo", "entrepano_bajo"]);
    if (n > 0) c.paso("Poner entrepaños", "Perfora para los soportes cada 32 mm o a la altura indicada y apoya los entrepaños.", ["entrepano"], ["soporte_entrepano"]);
    if (conPuertas) c.paso("Colgar puertas", "Instala las bisagras de cazoleta y regula las puertas.", ["puerta"], ["bisagra"]);
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

const muebleTv: DefinicionMueble = {
  id: "mueble_tv",
  nombre: "Mueble de TV / rack",
  categoria: "Sala y oficina",
  descripcion: "Mueble bajo para TV con nicho central abierto y módulos laterales con puertas o cajones.",
  parametros: [
    { clave: "ancho", etiqueta: "Ancho", tipo: "medida", min: 900, max: 2800, defecto: 1800 },
    { clave: "alto", etiqueta: "Alto del cuerpo", tipo: "medida", min: 300, max: 800, defecto: 450 },
    { clave: "fondo", etiqueta: "Fondo", tipo: "medida", min: 300, max: 600, defecto: 400 },
    { clave: "patas", etiqueta: "Alto de patas", tipo: "medida", min: 0, max: 250, defecto: 120, ayuda: "0 = apoyado en el piso" },
    {
      clave: "laterales",
      etiqueta: "Módulos laterales",
      tipo: "opcion",
      defecto: "puertas",
      opciones: [
        { valor: "puertas", etiqueta: "Puertas" },
        { valor: "cajones", etiqueta: "Cajones" },
        { valor: "abierto", etiqueta: "Abiertos" },
      ],
    },
    { clave: "anchoLateral", etiqueta: "Ancho de cada módulo lateral", tipo: "medida", min: 250, max: 700, defecto: 450 },
    { clave: "cajones", etiqueta: "Cajones por lado", tipo: "entero", min: 1, max: 3, defecto: 2 },
    { clave: "entrepano", etiqueta: "Entrepaño en el nicho central", tipo: "si_no", defecto: true },
  ],
  generar(p, cfg) {
    const c = new Constructor(cfg);
    const A = num(p.ancho, 1800), H = num(p.alto, 450), F = num(p.fondo, 400), P = num(p.patas, 120);
    const laterales = str(p.laterales, "puertas");
    const { ai, fi, e, yIni, altoHueco, piezasCaja } = c.caja({ A, H, F, yBase: P });
    const aL = Math.min(num(p.anchoLateral, 450), (ai - 2 * e) / 2 - 150);
    const anchoCentro = ai - 2 * aL - 2 * e;
    if (P > 0) {
      c.herraje("pata_niveladora", A > 1500 ? 6 : 4);
      c.rect("pata", 40, 0, 40, P, "detalle");
      c.rect("pata", A - 80, 0, 40, P, "detalle");
    }
    c.pieza("division", "División vertical", altoHueco, fi, 2, "cuerpo", CANTO_UN_LARGO);
    c.rect("division", e + aL, yIni, e, altoHueco);
    c.rect("division", A - e - aL - e, yIni, e, altoHueco);
    c.herraje("tornillo", 2 * 2 * 3);
    const conEntrepano = bool(p.entrepano, true);
    if (conEntrepano) c.entrepanos("entrepano", 1, e + aL + e, yIni, anchoCentro, altoHueco, fi - 20);
    if (anchoCentro < 400) c.advertencias.push(`El nicho central queda de ${Math.round(anchoCentro)} mm; achica los módulos laterales.`);
    // cada frente lateral cubre el lateral y media división
    const anchoFrente = e + aL + e / 2;
    if (laterales === "puertas") {
      c.puertas("puerta", 1, 0, P, anchoFrente, H);
      c.puertas("puerta", 1, A - anchoFrente, P, anchoFrente, H);
    } else if (laterales === "cajones") {
      const n = num(p.cajones, 2);
      c.cajones("cajon", n, aL, fi, 0, P, anchoFrente, H);
      c.cajones("cajon", n, aL, fi, A - anchoFrente, P, anchoFrente, H);
    }
    c.cota(0, P + H, A, P + H, 80);
    c.cota(A, P + H, A, 0, 80, `${Math.round(P + H)}`);
    c.paso("Armar la caja", "Une piso y techo a los laterales con 3 tornillos por unión.", piezasCaja, ["tornillo"]);
    c.paso("Colocar divisiones", `Atornilla las dos divisiones dejando ${Math.round(aL)} mm libres a cada lado y ${Math.round(anchoCentro)} mm para el nicho central.`, ["division"]);
    c.paso("Clavar el fondo", "Mide diagonales y clava el fondo. Deja una perforación de 60 mm detrás del nicho para pasar los cables.", ["fondo"], ["clavo_fondo"]);
    if (P > 0) c.paso("Instalar patas", "Atornilla las patas niveladoras al piso del mueble.", ["pata"], ["pata_niveladora"]);
    if (conEntrepano) c.paso("Colocar entrepaño", "Apoya el entrepaño del nicho sobre los soportes.", ["entrepano"], ["soporte_entrepano"]);
    if (laterales === "puertas") c.paso("Colgar puertas", "Instala bisagras de cazoleta y regula las puertas laterales.", ["puerta"], ["bisagra"]);
    if (laterales === "cajones") c.paso("Instalar cajones", "Arma las cajas, instala correderas y atornilla los frentes.", ["cajon_frente"]);
    return c.resultado(A, P + H);
  },
};

const despensero: DefinicionMueble = {
  id: "despensero",
  nombre: "Despensero / columna",
  categoria: "Cocina",
  descripcion: "Mueble alto de cocina con puertas arriba y abajo, entrepaño fijo al medio y entrepaños móviles.",
  parametros: [
    { clave: "ancho", etiqueta: "Ancho", tipo: "medida", min: 400, max: 1000, defecto: 600 },
    { clave: "alto", etiqueta: "Alto", tipo: "medida", min: 1500, max: 2440, defecto: 2100 },
    { clave: "fondo", etiqueta: "Fondo", tipo: "medida", min: 300, max: 650, defecto: 560 },
    { clave: "zocalo", etiqueta: "Alto del zócalo", tipo: "medida", min: 0, max: 150, defecto: 100 },
    { clave: "altoInferior", etiqueta: "Alto de puertas inferiores", tipo: "medida", min: 600, max: 1800, defecto: 1300 },
    { clave: "entrepanosInf", etiqueta: "Entrepaños abajo", tipo: "entero", min: 0, max: 6, defecto: 3 },
    { clave: "entrepanosSup", etiqueta: "Entrepaños arriba", tipo: "entero", min: 0, max: 3, defecto: 1 },
  ],
  generar(p, cfg) {
    const c = new Constructor(cfg);
    const A = num(p.ancho, 600), H = num(p.alto, 2100), F = num(p.fondo, 560), z = num(p.zocalo, 100);
    const { ai, fi, e, yIni, piezasCaja } = c.caja({ A, H, F, zocalo: z });
    const hInf = Math.min(num(p.altoInferior, 1300), H - z - 300);
    const yFijo = z + hInf - e / 2;
    c.pieza("entrepano_fijo", "Entrepaño fijo (medio)", ai, fi, 1, "cuerpo", CANTO_UN_LARGO);
    c.rect("entrepano_fijo", e, yFijo, ai, e);
    c.herraje("tornillo", 4);
    const nInf = num(p.entrepanosInf, 3), nSup = num(p.entrepanosSup, 1);
    c.entrepanos("entrepano", nInf, e, yIni, ai, yFijo - yIni, fi - 20);
    c.entrepanos("entrepano_sup", nSup, e, yFijo + e, ai, H - e - (yFijo + e), fi - 20);
    const np = A > 600 ? 2 : 1;
    c.puertas("puerta", np, 0, z, A, hInf);
    c.puertas("puerta_sup", np, 0, z + hInf, A, H - z - hInf);
    c.cota(0, H, A, H, 80);
    c.cota(A, H, A, 0, 80);
    c.cota(-1, z, -1, z + hInf, 80, `${Math.round(hInf)}`);
    c.paso("Armar la caja", "Arma el mueble acostado: une piso y techo a los laterales con 3 tornillos por unión.", piezasCaja.filter((x) => x !== "zocalo"), ["tornillo"]);
    if (z > 0) c.paso("Colocar el zócalo", "Atornilla el zócalo al frente, debajo del piso.", ["zocalo"]);
    c.paso("Entrepaño fijo", `Atornilla el entrepaño fijo a ${Math.round(yFijo)} mm del piso: le da rigidez a la columna y separa las dos puertas.`, ["entrepano_fijo"]);
    c.paso("Clavar el fondo", "Mide diagonales y clava el fondo. Fija el mueble a la pared: es alto y puede volcarse.", ["fondo"], ["clavo_fondo"]);
    if (nInf + nSup > 0) c.paso("Poner entrepaños", "Perfora para los soportes y apoya los entrepaños móviles.", ["entrepano", "entrepano_sup"], ["soporte_entrepano"]);
    c.paso("Colgar puertas", "Instala las bisagras y regula las puertas inferiores y superiores para que la junta quede pareja.", ["puerta", "puerta_sup"], ["bisagra"]);
    return c.resultado(A, H);
  },
};

const zapatero: DefinicionMueble = {
  id: "zapatero",
  nombre: "Zapatero",
  categoria: "Dormitorio",
  descripcion: "Mueble de poco fondo con puertas y varios entrepaños para zapatos.",
  parametros: [
    { clave: "ancho", etiqueta: "Ancho", tipo: "medida", min: 400, max: 1400, defecto: 800 },
    { clave: "alto", etiqueta: "Alto", tipo: "medida", min: 500, max: 2000, defecto: 1000 },
    { clave: "fondo", etiqueta: "Fondo", tipo: "medida", min: 250, max: 450, defecto: 350 },
    { clave: "zocalo", etiqueta: "Alto del zócalo", tipo: "medida", min: 0, max: 150, defecto: 60 },
    { clave: "puertas", etiqueta: "Número de puertas", tipo: "entero", min: 0, max: 3, defecto: 2, ayuda: "0 = abierto" },
    { clave: "entrepanos", etiqueta: "Entrepaños", tipo: "entero", min: 1, max: 10, defecto: 4 },
  ],
  generar(p, cfg) {
    const c = new Constructor(cfg);
    const A = num(p.ancho, 800), H = num(p.alto, 1000), F = num(p.fondo, 350), z = num(p.zocalo, 60);
    const { ai, fi, e, yIni, altoHueco, piezasCaja } = c.caja({ A, H, F, zocalo: z });
    const n = num(p.entrepanos, 4);
    c.entrepanos("entrepano", n, e, yIni, ai, altoHueco, fi - 20);
    const np = num(p.puertas, 2);
    c.puertas("puerta", np, 0, z, A, H - z);
    const separacion = (altoHueco - n * e) / (n + 1);
    if (separacion < 130) c.advertencias.push(`Quedan ${Math.round(separacion)} mm entre entrepaños: muy poco para zapatos (mín. 130 mm).`);
    c.cota(0, H, A, H, 80);
    c.cota(A, H, A, 0, 80);
    c.paso("Armar la caja", "Une piso y techo a los laterales con 3 tornillos por unión.", piezasCaja.filter((x) => x !== "zocalo"), ["tornillo"]);
    if (z > 0) c.paso("Colocar el zócalo", "Atornilla el zócalo al frente, debajo del piso.", ["zocalo"]);
    c.paso("Clavar el fondo", "Mide diagonales y clava el fondo. Puedes dejar perforaciones de ventilación de 8 mm.", ["fondo"], ["clavo_fondo"]);
    c.paso("Poner entrepaños", `Apoya los entrepaños cada ${Math.round(separacion + e)} mm sobre los soportes.`, ["entrepano"], ["soporte_entrepano"]);
    if (np > 0) c.paso("Colgar puertas", "Instala bisagras de cazoleta y regula las puertas.", ["puerta"], ["bisagra"]);
    return c.resultado(A, H);
  },
};

const vanitorio: DefinicionMueble = {
  id: "vanitorio",
  nombre: "Vanitorio de baño",
  categoria: "Baño",
  descripcion: "Mueble bajo lavamanos, colgado o sobre patas, con puertas o cajones y espacio para el sifón.",
  parametros: [
    { clave: "ancho", etiqueta: "Ancho", tipo: "medida", min: 400, max: 1500, defecto: 800 },
    { clave: "alto", etiqueta: "Alto del cuerpo", tipo: "medida", min: 350, max: 900, defecto: 500 },
    { clave: "fondo", etiqueta: "Fondo", tipo: "medida", min: 350, max: 600, defecto: 460 },
    {
      clave: "montaje",
      etiqueta: "Montaje",
      tipo: "opcion",
      defecto: "colgado",
      opciones: [
        { valor: "colgado", etiqueta: "Colgado" },
        { valor: "patas", etiqueta: "Sobre patas" },
      ],
    },
    { clave: "altura", etiqueta: "Altura desde el piso", tipo: "medida", min: 0, max: 600, defecto: 350, ayuda: "Colgado: altura bajo el mueble. Patas: alto de la pata." },
    {
      clave: "frente",
      etiqueta: "Tipo de frente",
      tipo: "opcion",
      defecto: "puertas",
      opciones: [
        { valor: "puertas", etiqueta: "Puertas" },
        { valor: "cajones", etiqueta: "Cajones" },
      ],
    },
    { clave: "puertas", etiqueta: "Número de puertas", tipo: "entero", min: 1, max: 2, defecto: 2 },
    { clave: "cajones", etiqueta: "Número de cajones", tipo: "entero", min: 1, max: 3, defecto: 2 },
  ],
  generar(p, cfg) {
    const c = new Constructor(cfg);
    const A = num(p.ancho, 800), H = num(p.alto, 500), F = num(p.fondo, 460);
    const montaje = str(p.montaje, "colgado");
    const yB = num(p.altura, 350);
    const frente = str(p.frente, "puertas");
    const { ai, fi, piezasCaja } = c.caja({ A, H, F, yBase: yB, superior: "travesanos" });
    if (montaje === "patas" && yB > 0) {
      c.herraje("pata_niveladora", 4);
      c.rect("pata", 40, 0, 40, yB, "detalle");
      c.rect("pata", A - 80, 0, 40, yB, "detalle");
    } else c.herraje("colgador_mueble", 2);
    if (frente === "puertas") c.puertas("puerta", num(p.puertas, 2), 0, yB, A, H);
    else {
      c.cajones("cajon", num(p.cajones, 2), ai, Math.min(fi, 400), 0, yB, A, H);
      c.advertencias.push("Con cajones, recorta la parte trasera de la caja del cajón superior para dejar paso al sifón.");
    }
    c.cota(0, yB + H, A, yB + H, 80);
    c.cota(A, yB + H, A, 0, 80, `${Math.round(yB + H)}`);
    c.paso("Armar la caja", "Une el piso entre los laterales y los dos travesaños superiores. Usa melamina hidrófuga si la consigues.", piezasCaja, ["tornillo"]);
    c.paso("Clavar el fondo", "Clava el fondo y perfora el paso del desagüe y de las llaves de agua.", ["fondo"], ["clavo_fondo"]);
    if (montaje === "patas" && yB > 0) c.paso("Instalar patas", "Atornilla las patas niveladoras al piso del mueble.", ["pata"], ["pata_niveladora"]);
    else c.paso("Colgar el mueble", `Fija los colgadores a la pared con tarugos, con la base a ${Math.round(yB)} mm del piso.`, [], ["colgador_mueble"]);
    if (frente === "puertas") c.paso("Colgar puertas", "Instala bisagras de cazoleta y regula las puertas.", ["puerta"], ["bisagra"]);
    else c.paso("Instalar cajones", "Arma las cajas, instala correderas y atornilla los frentes.", ["cajon_frente"]);
    c.paso("Sellar", "Sella con silicona el contorno del lavamanos y los cantos cercanos al agua.", []);
    return c.resultado(A, yB + H);
  },
};

const aparador: DefinicionMueble = {
  id: "aparador",
  nombre: "Aparador / bifé",
  categoria: "Comedor",
  descripcion: "Mueble de comedor de 2 a 4 cuerpos con puertas y, si quieres, una fila de cajones arriba.",
  parametros: [
    { clave: "ancho", etiqueta: "Ancho", tipo: "medida", min: 800, max: 2400, defecto: 1600 },
    { clave: "alto", etiqueta: "Alto del cuerpo", tipo: "medida", min: 600, max: 1000, defecto: 800 },
    { clave: "fondo", etiqueta: "Fondo", tipo: "medida", min: 350, max: 550, defecto: 450 },
    { clave: "patas", etiqueta: "Alto de patas", tipo: "medida", min: 0, max: 250, defecto: 100, ayuda: "0 = con zócalo, apoyado en el piso" },
    { clave: "cuerpos", etiqueta: "Cuerpos", tipo: "entero", min: 2, max: 4, defecto: 3 },
    { clave: "cajones", etiqueta: "Fila de cajones arriba", tipo: "si_no", defecto: true },
    { clave: "entrepanos", etiqueta: "Entrepaños por cuerpo", tipo: "entero", min: 0, max: 2, defecto: 1 },
  ],
  generar(p, cfg) {
    const c = new Constructor(cfg);
    const A = num(p.ancho, 1600), H = num(p.alto, 800), F = num(p.fondo, 450), P = num(p.patas, 100);
    const n = Math.max(2, Math.round(num(p.cuerpos, 3)));
    const conCajones = bool(p.cajones, true);
    const z = P > 0 ? 0 : 60;
    const { ai, fi, e, yIni, altoHueco, piezasCaja } = c.caja({ A, H, F, yBase: P, zocalo: z });
    if (P > 0) {
      c.herraje("pata_niveladora", n > 2 ? 6 : 4);
      c.rect("pata", 40, 0, 40, P, "detalle");
      c.rect("pata", A - 80, 0, 40, P, "detalle");
    }
    const anchoHueco = (ai - (n - 1) * e) / n;
    c.pieza("division", "División vertical", altoHueco, fi, n - 1, "cuerpo", CANTO_UN_LARGO);
    c.herraje("tornillo", (n - 1) * 2 * 3);
    const altoCajon = conCajones ? 160 : 0;
    const yFijo = yIni + altoHueco - altoCajon - e;
    for (let i = 0; i < n; i++) {
      const x = e + i * (anchoHueco + e);
      if (i > 0) c.rect("division", x - e, yIni, e, altoHueco);
      if (conCajones) {
        c.pieza("fijo", "Entrepaño fijo bajo cajones", anchoHueco, fi, 1, "cuerpo", CANTO_UN_LARGO);
        c.rect("fijo", x, yFijo, anchoHueco, e);
        c.herraje("tornillo", 4);
      }
      c.entrepanos("entrepano", Math.round(num(p.entrepanos, 1)), x, yIni, anchoHueco, (conCajones ? yFijo : yIni + altoHueco) - yIni, fi - 20);
    }
    // frentes: cada cuerpo cubre su hueco más media división a cada lado
    const anchoFrente = A / n;
    const altoPuerta = H - z - (conCajones ? altoCajon + e : 0);
    for (let i = 0; i < n; i++) {
      c.puertas("puerta", anchoFrente > 650 ? 2 : 1, i * anchoFrente, P + z, anchoFrente, altoPuerta);
      if (conCajones) c.cajones("cajon", 1, anchoHueco, fi, i * anchoFrente, P + z + altoPuerta, anchoFrente, H - z - altoPuerta);
    }
    c.cota(0, P + H, A, P + H, 80);
    c.cota(A, P + H, A, 0, 80, `${Math.round(P + H)}`);
    c.paso("Armar la caja", "Une piso y techo a los laterales con 3 tornillos por unión.", piezasCaja, ["tornillo"]);
    c.paso("Colocar divisiones", `Reparte ${n - 1} división(es) dejando ${Math.round(anchoHueco)} mm libres por cuerpo.`, ["division"]);
    if (conCajones) c.paso("Fijar entrepaños bajo cajones", `Atornilla un entrepaño fijo a ${altoCajon} mm bajo el techo en cada cuerpo: ahí van los cajones.`, ["fijo"]);
    c.paso("Clavar el fondo", "Mide diagonales y clava el fondo.", ["fondo"], ["clavo_fondo"]);
    if (P > 0) c.paso("Instalar patas", "Atornilla las patas niveladoras al piso del mueble.", ["pata"], ["pata_niveladora"]);
    c.paso("Colgar puertas", "Instala bisagras de cazoleta y regula las puertas.", ["puerta"], ["bisagra"]);
    if (conCajones) c.paso("Instalar cajones", "Arma las cajas, instala correderas y atornilla los frentes.", ["cajon_frente"]);
    return c.resultado(A, P + H);
  },
};

const mesaCentro: DefinicionMueble = {
  id: "mesa_centro",
  nombre: "Mesa de centro",
  categoria: "Sala y oficina",
  descripcion: "Mesa baja de sala tipo cajón, con repisa inferior abierta y cajón opcional.",
  parametros: [
    { clave: "ancho", etiqueta: "Largo", tipo: "medida", min: 600, max: 1600, defecto: 1000 },
    { clave: "alto", etiqueta: "Alto", tipo: "medida", min: 300, max: 550, defecto: 420 },
    { clave: "fondo", etiqueta: "Ancho (fondo)", tipo: "medida", min: 400, max: 900, defecto: 600 },
    { clave: "cajon", etiqueta: "Con cajón", tipo: "si_no", defecto: false },
  ],
  generar(p, cfg) {
    const c = new Constructor(cfg);
    const A = num(p.ancho, 1000), H = num(p.alto, 420), F = num(p.fondo, 600);
    const { ai, fi, yIni, altoHueco, piezasCaja } = c.caja({ A, H, F, conFondo: false });
    c.entrepanos("entrepano", 1, c.e, yIni, ai, altoHueco, fi, true);
    if (bool(p.cajon, false)) c.cajones("cajon", 1, ai, fi, 0, H - 140, A, 140);
    c.cota(0, H, A, H, 80);
    c.cota(A, H, A, 0, 80);
    c.paso("Armar la caja", "Une piso y cubierta a los laterales con 3 tornillos por unión. Tapa las cabezas de los tornillos de la cubierta con tapatornillos del color.", piezasCaja, ["tornillo"]);
    c.paso("Fijar la repisa", "Atornilla la repisa intermedia a media altura.", ["entrepano"]);
    if (bool(p.cajon, false)) c.paso("Instalar el cajón", "Arma la caja, instala correderas y atornilla el frente.", ["cajon_frente"]);
    return c.resultado(A, H);
  },
};

const repisaFlotante: DefinicionMueble = {
  id: "repisa_flotante",
  nombre: "Repisa flotante / nicho",
  categoria: "Sala y oficina",
  descripcion: "Caja abierta colgada en la pared con soportes ocultos, para TV, libros o decoración.",
  parametros: [
    { clave: "ancho", etiqueta: "Ancho", tipo: "medida", min: 300, max: 2400, defecto: 1200 },
    { clave: "alto", etiqueta: "Alto", tipo: "medida", min: 150, max: 800, defecto: 300 },
    { clave: "fondo", etiqueta: "Fondo", tipo: "medida", min: 150, max: 450, defecto: 250 },
    { clave: "divisiones", etiqueta: "Divisiones", tipo: "entero", min: 0, max: 4, defecto: 1 },
    { clave: "alturaPiso", etiqueta: "Altura desde el piso", tipo: "medida", min: 300, max: 2000, defecto: 1300 },
  ],
  generar(p, cfg) {
    const c = new Constructor(cfg);
    const A = num(p.ancho, 1200), H = num(p.alto, 300), F = num(p.fondo, 250), Y = num(p.alturaPiso, 1300);
    const d = Math.round(num(p.divisiones, 1));
    const { ai, fi, e, yIni, altoHueco, piezasCaja } = c.caja({ A, H, F, yBase: Y, conFondo: false });
    if (d > 0) {
      const paso = (ai - d * e) / (d + 1);
      c.pieza("division", "División vertical", altoHueco, fi, d, "cuerpo", CANTO_UN_LARGO);
      for (let i = 1; i <= d; i++) c.rect("division", e + i * paso + (i - 1) * e, yIni, e, altoHueco);
      c.herraje("tornillo", d * 2 * 3);
    }
    c.herraje("colgador_mueble", A > 1200 ? 3 : 2);
    if (A > 900 && F > 250) c.advertencias.push("Para repisas largas y profundas usa soportes ocultos de varilla y anclajes a muro de concreto.");
    c.cota(0, Y + H, A, Y + H, 80);
    c.cota(A, Y + H, A, Y, 80, `${Math.round(H)}`);
    c.paso("Armar la caja", "Une piso y techo a los laterales con 3 tornillos por unión.", piezasCaja, ["tornillo"]);
    if (d > 0) c.paso("Colocar divisiones", "Atornilla las divisiones desde arriba y desde abajo.", ["division"]);
    c.paso("Colgar en la pared", `Fija los soportes con chazos a ${Math.round(Y)} mm del piso, nivela y cuelga la caja.`, [], ["colgador_mueble"]);
    return c.resultado(A, Y + H);
  },
};

export const CATALOGO: DefinicionMueble[] = [bajoCocina, aereoCocina, despensero, closet, zapatero, librero, escritorio, muebleTv, mesaCentro, repisaFlotante, aparador, mesaNoche, cajonera, vanitorio].map(conExtras);

export function buscarMueble(id: string) {
  return CATALOGO.find((m) => m.id === id);
}

export function valoresPorDefecto(def: DefinicionMueble) {
  return Object.fromEntries(def.parametros.map((p) => [p.clave, p.defecto]));
}
