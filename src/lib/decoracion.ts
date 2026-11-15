// Decoración de la vista 3D según el tipo de mueble (TV, lavamanos, libros, ropa…), hecha 100 % con código.
// No entra en cortes ni en la cotización: solo ayuda a que el cliente se imagine el mueble en uso.
// Unidades en metros; x centrado en el mueble, y desde el piso, pared en z = 0.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Bloque, Modelo3D } from "./motor/modelo3d";

const MM = 0.001;

/** Altura a la que se cuelga el mueble en la vista 3D (los aéreos van sobre el mesón). */
export const elevacion = (mueble: string) => (mueble === "aereo_cocina" ? 1.45 : 0);

function azarCon(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const mat = (color: string, rugosidad = 0.6, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rugosidad, metalness: metal });

function malla(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0, sombra = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = sombra;
  m.receiveShadow = true;
  return m;
}

/** Caja apoyada: x, z = centro; y = base. */
function caja(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, radio = 0.003) {
  const r = Math.min(radio, w / 2.2, h / 2.2, d / 2.2);
  return malla(new RoundedBoxGeometry(w, h, d, 2, r), material, x, y + h / 2, z);
}

function cilindro(r1: number, r2: number, h: number, material: THREE.Material, x: number, y: number, z: number, seg = 28) {
  return malla(new THREE.CylinderGeometry(r1, r2, h, seg), material, x, y + h / 2, z);
}

/** Piedra / cuarzo con motas finas para mesones. */
function texturaPiedra(base: string, mota: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  const azar = azarCon(23);
  g.fillStyle = mota;
  for (let i = 0; i < 1500; i++) {
    g.globalAlpha = 0.08 + azar() * 0.25;
    const r = 0.4 + azar() * 1.6;
    g.beginPath();
    g.arc(azar() * 256, azar() * 256, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}

function meson(ancho: number, fondo: number, y: number, grosor: number, oscuro = false) {
  const material = new THREE.MeshPhysicalMaterial({
    map: oscuro ? texturaPiedra("#3b3d40", "#9a9da1") : texturaPiedra("#ece9e3", "#8d8780"),
    roughness: 0.28,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
  });
  return caja(ancho, grosor, fondo, material, 0, y, fondo / 2, 0.004);
}

/** Jarrón torneado con ramas. */
function jarron(x: number, y: number, z: number, escala = 1, color = "#d9d3c7") {
  const g = new THREE.Group();
  const perfil = [
    [0.0, 0],
    [0.045, 0],
    [0.065, 0.05],
    [0.06, 0.12],
    [0.03, 0.19],
    [0.028, 0.22],
    [0.035, 0.24],
  ].map(([r, h]) => new THREE.Vector2(r * escala, h * escala));
  g.add(malla(new THREE.LatheGeometry(perfil, 28), new THREE.MeshStandardMaterial({ color, roughness: 0.55, side: THREE.DoubleSide })));
  const rama = mat("#7d6a4f", 0.8);
  const hoja = mat("#6f8a5b", 0.8);
  const azar = azarCon(5);
  for (let i = 0; i < 5; i++) {
    const a = azar() * Math.PI * 2;
    const incl = 0.12 + azar() * 0.3;
    const largo = (0.22 + azar() * 0.2) * escala;
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.0025 * escala, 0.0035 * escala, largo, 6), rama);
    r.position.set(Math.sin(a) * Math.sin(incl) * largo * 0.5, 0.2 * escala + Math.cos(incl) * largo * 0.5, Math.cos(a) * Math.sin(incl) * largo * 0.5);
    r.rotation.set(Math.cos(a) * incl, 0, -Math.sin(a) * incl);
    r.castShadow = true;
    g.add(r);
    for (let k = 0; k < 3; k++) {
      const t = 0.55 + k * 0.2;
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.022 * escala, 8, 6), hoja);
      h.scale.set(1, 1.5, 0.5);
      h.position.set(Math.sin(a) * Math.sin(incl) * largo * t, 0.2 * escala + Math.cos(incl) * largo * t, Math.cos(a) * Math.sin(incl) * largo * t);
      h.castShadow = true;
      g.add(h);
    }
  }
  g.position.set(x, y, z);
  return g;
}

/** Matera pequeña con planta. */
function plantita(x: number, y: number, z: number, escala = 1) {
  const g = new THREE.Group();
  g.add(cilindro(0.055 * escala, 0.042 * escala, 0.09 * escala, mat("#c7b8a3", 0.8), 0, 0, 0));
  const azar = azarCon(9);
  const verdes = [mat("#55784a", 0.8), mat("#6c8f5a", 0.8)];
  for (let i = 0; i < 12; i++) {
    const a = azar() * Math.PI * 2;
    const r = azar() * 0.045 * escala;
    const s = new THREE.Mesh(new THREE.SphereGeometry((0.03 + azar() * 0.025) * escala, 8, 6), verdes[i % 2]);
    s.scale.set(1, 0.7 + azar() * 0.6, 1);
    s.position.set(Math.cos(a) * r, (0.1 + azar() * 0.09) * escala, Math.sin(a) * r);
    s.castShadow = true;
    g.add(s);
  }
  g.position.set(x, y, z);
  return g;
}

/** Lámpara de mesa encendida. */
function lampara(x: number, y: number, z: number, escala = 1) {
  const g = new THREE.Group();
  const metal = mat("#b08d57", 0.35, 0.9);
  g.add(cilindro(0.06 * escala, 0.065 * escala, 0.015 * escala, metal, 0, 0, 0));
  g.add(cilindro(0.008 * escala, 0.008 * escala, 0.22 * escala, metal, 0, 0.015 * escala, 0, 10));
  const pantalla = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075 * escala, 0.11 * escala, 0.15 * escala, 32, 1, true),
    new THREE.MeshStandardMaterial({ color: "#f3e8d4", roughness: 0.9, side: THREE.DoubleSide, emissive: "#ffd9a0", emissiveIntensity: 0.55 }),
  );
  pantalla.position.y = 0.3 * escala;
  pantalla.castShadow = true;
  g.add(pantalla);
  g.position.set(x, y, z);
  return g;
}

const COLORES_LIBRO = ["#2f4858", "#8c4a3c", "#d8cdb8", "#56705c", "#c9973f", "#3b3b3f", "#a9b8bd", "#7b5d75", "#e8e2d5", "#b8643c"];

/** Pila de libros acostados. */
function librosApilados(x: number, y: number, z: number, n = 3, semilla = 1) {
  const g = new THREE.Group();
  const azar = azarCon(semilla * 31 + 7);
  let h = 0;
  for (let i = 0; i < n; i++) {
    const w = 0.2 + azar() * 0.05, d = 0.14 + azar() * 0.03, e = 0.022 + azar() * 0.02;
    const l = caja(w, e, d, mat(COLORES_LIBRO[Math.floor(azar() * COLORES_LIBRO.length)], 0.75), (azar() - 0.5) * 0.02, h, (azar() - 0.5) * 0.015, 0.002);
    l.rotation.y = (azar() - 0.5) * 0.25;
    g.add(l);
    h += e;
  }
  g.position.set(x, y, z);
  return { grupo: g, alto: h };
}

/** Marco con lámina, recostado contra la pared. */
function marco(x: number, y: number, z: number, w: number, h: number, color: string) {
  const g = new THREE.Group();
  g.add(caja(w, h, 0.018, mat("#2a2a2c", 0.5), 0, 0, 0, 0.002));
  const lam = malla(new THREE.PlaneGeometry(w * 0.8, h * 0.8), mat("#f2efe8", 0.9), 0, h / 2, 0.0095, false);
  g.add(lam);
  const fig = malla(new THREE.CircleGeometry(Math.min(w, h) * 0.22, 32), mat(color, 0.9), 0, h * 0.55, 0.0105, false);
  g.add(fig);
  g.position.set(x, y, z);
  g.rotation.x = -0.12;
  return g;
}

/** Espejo redondo de pared. */
function espejo(x: number, y: number, radio: number) {
  const g = new THREE.Group();
  const aro = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, 0.02, 64), mat("#1f1f21", 0.45, 0.5));
  aro.rotation.x = Math.PI / 2;
  aro.position.set(0, 0, 0.01);
  aro.castShadow = true;
  g.add(aro);
  // reflejo simulado con un degradado claro (un espejo real reflejaría la habitación)
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 128, 128);
  grad.addColorStop(0, "#f4f7f7");
  grad.addColorStop(0.45, "#cfdadd");
  grad.addColorStop(0.55, "#e3eaeb");
  grad.addColorStop(1, "#b4c3c8");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const reflejo = new THREE.CanvasTexture(c);
  reflejo.colorSpace = THREE.SRGBColorSpace;
  const luna = new THREE.Mesh(new THREE.CircleGeometry(radio * 0.96, 64), new THREE.MeshStandardMaterial({ map: reflejo, metalness: 0.2, roughness: 0.1 }));
  luna.position.z = 0.0206;
  g.add(luna);
  g.position.set(x, y, 0);
  return g;
}

function televisor(ancho: number, yCentro: number) {
  const g = new THREE.Group();
  const alto = ancho * 0.575;
  g.add(malla(new RoundedBoxGeometry(ancho, alto, 0.035, 2, 0.006), mat("#101012", 0.5, 0.3), 0, yCentro, 0.03));
  const pantalla = new THREE.Mesh(
    new THREE.PlaneGeometry(ancho - 0.016, alto - 0.016),
    new THREE.MeshPhysicalMaterial({ color: "#07090d", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 }),
  );
  pantalla.position.set(0, yCentro, 0.0478);
  g.add(pantalla);
  return g;
}

function portatil(x: number, y: number, z: number) {
  const g = new THREE.Group();
  const alu = mat("#b9bcc1", 0.35, 0.85);
  g.add(caja(0.32, 0.012, 0.22, alu, 0, 0, 0, 0.004));
  const teclado = malla(new THREE.PlaneGeometry(0.27, 0.1), mat("#2c2d30", 0.7), 0, 0.0124, -0.035, false);
  teclado.rotation.x = -Math.PI / 2;
  g.add(teclado);
  const tapa = new THREE.Group();
  tapa.add(caja(0.32, 0.21, 0.006, alu, 0, 0, 0, 0.003));
  const pant = malla(
    new THREE.PlaneGeometry(0.3, 0.19),
    new THREE.MeshStandardMaterial({ color: "#1c2733", roughness: 0.25, emissive: "#3d5a78", emissiveIntensity: 0.35 }),
    0,
    0.105,
    0.0035,
    false,
  );
  tapa.add(pant);
  tapa.position.set(0, 0.012, -0.108);
  tapa.rotation.x = -0.3;
  g.add(tapa);
  g.position.set(x, y, z);
  g.rotation.y = 0.18;
  return g;
}

function taza(x: number, y: number, z: number) {
  const g = new THREE.Group();
  g.add(cilindro(0.04, 0.034, 0.085, mat("#e9e4da", 0.5), 0, 0, 0));
  const asa = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 8, 20), mat("#e9e4da", 0.5));
  asa.position.set(0.042, 0.045, 0);
  g.add(asa);
  g.position.set(x, y, z);
  return g;
}

/** Lavamanos de sobreponer con grifo. */
function lavamanos(x: number, y: number, z: number) {
  const g = new THREE.Group();
  const loza = new THREE.MeshPhysicalMaterial({ color: "#f7f7f5", roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide });
  const perfil = [
    [0.0, 0.012],
    [0.12, 0.012],
    [0.185, 0.07],
    [0.2, 0.125],
    [0.207, 0.125],
    [0.195, 0.06],
    [0.13, 0.0],
    [0.0, 0.0],
  ].map(([r, h]) => new THREE.Vector2(r, h));
  const cuenco = malla(new THREE.LatheGeometry(perfil, 48), loza);
  cuenco.scale.set(1.15, 1, 0.9);
  g.add(cuenco);
  const cromo = mat("#d5d8dc", 0.12, 1);
  g.add(cilindro(0.018, 0.022, 0.2, cromo, 0, 0, -0.215, 20));
  const cano = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.13, 16), cromo);
  cano.rotation.x = Math.PI / 2 - 0.2;
  cano.position.set(0, 0.185, -0.155);
  cano.castShadow = true;
  g.add(cano);
  const manija = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 10), cromo);
  manija.rotation.z = Math.PI / 2 - 0.3;
  manija.position.set(0.035, 0.215, -0.215);
  g.add(manija);
  g.position.set(x, y, z);
  return g;
}

function frutero(x: number, y: number, z: number) {
  const g = new THREE.Group();
  const perfil = [
    [0.0, 0.006],
    [0.06, 0.006],
    [0.13, 0.06],
    [0.135, 0.06],
    [0.065, 0.0],
    [0.0, 0.0],
  ].map(([r, h]) => new THREE.Vector2(r, h));
  g.add(malla(new THREE.LatheGeometry(perfil, 36), new THREE.MeshStandardMaterial({ color: "#8a6a4c", roughness: 0.6, side: THREE.DoubleSide })));
  const frutas = ["#d9a23a", "#c7542f", "#8fa84a", "#d9a23a", "#c7542f"];
  frutas.forEach((c, i) => {
    const a = (i / frutas.length) * Math.PI * 2;
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 10), mat(c, 0.55));
    f.position.set(Math.cos(a) * 0.05, 0.05 + (i % 2) * 0.012, Math.sin(a) * 0.05);
    f.castShadow = true;
    g.add(f);
  });
  g.position.set(x, y, z);
  return g;
}

/** Fila de libros de pie; se agrupan por color para dibujar pocos objetos. */
function filaLibros(porColor: Map<number, THREE.BufferGeometry[]>, x0: number, largo: number, y: number, zFrente: number, altoLibre: number, azar: () => number) {
  let x = x0;
  const fin = x0 + largo;
  while (x < fin - 0.02) {
    const e = 0.018 + azar() * 0.028;
    if (x + e > fin) break;
    const h = Math.min(altoLibre - 0.03, 0.17 + azar() * 0.1);
    const d = 0.13 + azar() * 0.06;
    const geo = new THREE.BoxGeometry(e - 0.0012, h, d);
    geo.translate(x + e / 2, y + h / 2, zFrente - 0.02 - d / 2 - azar() * 0.012);
    const c = Math.floor(azar() * COLORES_LIBRO.length);
    if (!porColor.has(c)) porColor.set(c, []);
    porColor.get(c)!.push(geo);
    x += e;
  }
}

const esRepisa = (b: Bloque) => !b.padre && b.forma === "caja" && b.tipo === "cuerpo" && b.w > b.h * 3 && (b.piezaId === "piso" || b.piezaId.startsWith("entrepano"));

/** Libros y objetos en las repisas abiertas (las que no quedan detrás de una puerta o cajón). */
function decorarRepisas(g: THREE.Group, modelo: Modelo3D, X: (mm: number) => number) {
  const horizontales = modelo.bloques.filter((b) => !b.padre && b.forma === "caja" && b.tipo === "cuerpo" && b.w > b.h * 3);
  const frentes = modelo.bloques.filter((b) => b.movil);
  const repisas = modelo.bloques.filter(esRepisa).sort((a, b) => a.y - b.y || a.x - b.x);
  const porColor = new Map<number, THREE.BufferGeometry[]>();
  const azar = azarCon(41);
  repisas.forEach((r, i) => {
    const y0 = r.y + r.h;
    const encima = horizontales.filter((b) => b.y > r.y + 1 && b.x < r.x + r.w - 5 && b.x + b.w > r.x + 5).sort((a, b) => a.y - b.y)[0];
    if (!encima) return;
    const libre = (encima.y - y0) * MM;
    if (libre < 0.2) return;
    const yMedio = y0 + (encima.y - y0) / 2;
    if (frentes.some((f) => f.x < r.x + r.w / 2 && f.x + f.w > r.x + r.w / 2 && f.y < yMedio && f.y + f.h > yMedio)) return;
    const y = y0 * MM;
    const zF = (r.z + r.d) * MM;
    const ancho = r.w * MM - 0.03;
    const xi = X(r.x) + 0.015;
    const fraccion = 0.42 + azar() * 0.28;
    const alDerecho = i % 2 === 0;
    const largoLibros = ancho * fraccion;
    filaLibros(porColor, alDerecho ? xi : xi + ancho - largoLibros, largoLibros, y, zF, libre, azar);
    const resto = ancho - largoLibros;
    if (resto > 0.2) {
      const xc = alDerecho ? xi + largoLibros + resto / 2 + 0.02 : xi + resto / 2 - 0.02;
      const zc = zF - Math.min(0.14, (r.d * MM) / 2);
      const tipo = i % 4;
      if (tipo === 0 && libre > 0.34) g.add(jarron(xc, y, zc, Math.min(1, libre / 0.52)));
      else if (tipo === 1) {
        const pila = librosApilados(xc, y, zc, 3, i + 2);
        g.add(pila.grupo);
      } else if (tipo === 2 && libre > 0.24) g.add(plantita(xc, y, zc, Math.min(1.1, libre / 0.26)));
      else g.add(caja(Math.min(0.24, resto - 0.06), Math.min(0.14, libre - 0.06), 0.18, mat("#b89b78", 0.85), xc, y, zc, 0.006));
    }
  });
  porColor.forEach((geos, c) => {
    const unido = mergeGeometries(geos);
    geos.forEach((x) => x.dispose());
    if (unido) g.add(malla(unido, mat(COLORES_LIBRO[c], 0.78)));
  });
}

const COLORES_ROPA = ["#d9d4c8", "#4a5a6a", "#8a9a8c", "#c9a27a", "#3a3f46", "#b9bfc6", "#8a5a4c", "#e6e1d6", "#6b7a64", "#a8b4c4", "#f0ede6", "#5c6f86"];

/** Ropa colgada en los tubos y cajas organizadoras en los maleteros (se ven al abrir). */
function decorarCloset(g: THREE.Group, modelo: Modelo3D, X: (mm: number) => number) {
  const azar = azarCon(77);
  const pisos = modelo.bloques.filter((b) => !b.padre && b.tipo === "cuerpo" && b.w > b.h * 3);
  const porColor = new Map<number, THREE.BufferGeometry[]>();
  for (const t of modelo.bloques.filter((b) => b.piezaId === "tubo")) {
    const yT = (t.y + t.h / 2) * MM;
    const debajo = pisos.filter((p) => p.y < t.y && p.x < t.x + t.w / 2 && p.x + p.w > t.x + t.w / 2).sort((a, b) => b.y - a.y)[0];
    const piso = debajo ? (debajo.y + debajo.h) * MM : 0;
    const libre = yT - piso - 0.12;
    if (libre < 0.4) continue;
    const zc = (t.z + t.d / 2) * MM;
    // prendas colgadas, vistas de canto: apretadas, con largos distintos y un par de huecos
    let x = X(t.x) + 0.04;
    const fin = X(t.x + t.w) - 0.04;
    const hueco = x + (fin - x) * (0.55 + azar() * 0.25);
    while (x < fin - 0.05) {
      if (x > hueco && x < hueco + 0.14) {
        x += 0.14;
        continue;
      }
      const e = 0.045 + azar() * 0.03;
      const larga = azar() < 0.3;
      const h = Math.min(libre, larga ? 0.95 + azar() * 0.25 : 0.6 + azar() * 0.2);
      const d = 0.4 + azar() * 0.06;
      // silueta de la prenda (hombros caídos y ruedo), extruida con el grueso de la tela
      const m = d / 2, cae = 0.07 + azar() * 0.03, ruedo = m * (0.82 + azar() * 0.3);
      const silueta = new THREE.Shape();
      silueta.moveTo(-0.035, 0);
      silueta.lineTo(0.035, 0);
      silueta.quadraticCurveTo(m * 0.7, -cae * 0.35, m, -cae);
      silueta.lineTo(ruedo, -h);
      silueta.lineTo(-ruedo, -h);
      silueta.lineTo(-m, -cae);
      silueta.quadraticCurveTo(-m * 0.7, -cae * 0.35, -0.035, 0);
      const bisel = e * 0.4;
      const geo = new THREE.ExtrudeGeometry(silueta, { depth: e - 2 * bisel, bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 3, curveSegments: 6 });
      geo.rotateY(Math.PI / 2); // el grueso queda a lo largo del tubo
      geo.translate(x + bisel, yT - 0.04, zc + (azar() - 0.5) * 0.02);
      const c = Math.floor(azar() * COLORES_ROPA.length);
      if (!porColor.has(c)) porColor.set(c, []);
      porColor.get(c)!.push(geo);
      // gancho
      const gancho = new THREE.BoxGeometry(0.004, 0.05, 0.004);
      gancho.translate(x + e / 2, yT - 0.018, zc);
      if (!porColor.has(-1)) porColor.set(-1, []);
      porColor.get(-1)!.push(gancho.toNonIndexed());
      gancho.dispose();
      x += e + azar() * 0.006;
    }
  }
  porColor.forEach((geos, c) => {
    const unido = mergeGeometries(geos);
    geos.forEach((x) => x.dispose());
    if (unido) g.add(malla(unido, c < 0 ? mat("#8d9096", 0.4, 0.8) : mat(COLORES_ROPA[c], 0.95)));
  });
  const techo = modelo.bloques.find((b) => b.piezaId === "techo");
  for (const m of modelo.bloques.filter((b) => b.piezaId === "maletero")) {
    const libre = techo ? (techo.y - m.y - m.h) * MM : 0.3;
    const h = Math.min(0.22, libre - 0.05);
    if (h < 0.1) continue;
    const n = Math.max(1, Math.floor((m.w * MM - 0.06) / 0.36));
    const paso = (m.w * MM) / n;
    for (let i = 0; i < n; i++)
      g.add(caja(Math.min(0.32, paso - 0.04), h, Math.min(0.36, m.d * MM - 0.08), mat(i % 2 ? "#cdbb9f" : "#a9977c", 0.9), X(m.x) + paso * (i + 0.5), (m.y + m.h) * MM, (m.z + m.d / 2) * MM, 0.01));
  }
}

/** Mueble bajo sencillo con mesón, para dar contexto al aéreo de cocina. */
function bajoDeContexto(g: THREE.Group, ancho: number) {
  const cuerpo = mat("#dedad3", 0.6);
  g.add(caja(ancho, 0.1, 0.5, mat("#3a3a3c", 0.6), 0, 0, 0.27, 0.002));
  g.add(caja(ancho, 0.72, 0.56, cuerpo, 0, 0.1, 0.28, 0.002));
  const n = Math.max(1, Math.round(ancho / 0.45));
  const w = ancho / n;
  for (let i = 0; i < n; i++) {
    g.add(caja(w - 0.004, 0.716, 0.018, mat("#e7e3dc", 0.55), -ancho / 2 + w * (i + 0.5), 0.102, 0.569, 0.0015));
    g.add(caja(w + 0.0005, 0.72, 0.001, mat("#1b1917", 1), -ancho / 2 + w * (i + 0.5), 0.1, 0.5605, 0));
  }
  g.add(meson(ancho, 0.6, 0.82, 0.03, true));
}

export interface Decoracion {
  grupo: THREE.Group;
  /** Altura máxima (m) que alcanza la decoración, para encuadrar la cámara. */
  yMax: number;
  /** Altura mínima de interés (m): si el mueble va colgado, desde dónde encuadrar. */
  yMin: number;
}

/** Decoración para un mueble. `modelo` en mm; el resultado en metros, ya ubicado frente a la pared. */
export function crearDecoracion(mueble: string, modelo: Modelo3D): Decoracion {
  const g = new THREE.Group();
  const A = modelo.ancho * MM;
  const X = (mm: number) => (mm - modelo.ancho / 2) * MM;
  const solidos = modelo.bloques.filter((b) => !b.padre && b.forma === "caja" && b.tipo !== "metal" && b.tipo !== "fondo");
  const tope = Math.max(...solidos.map((b) => b.y + b.h)) * MM; // cara superior del mueble
  const cuerpoF = Math.max(...solidos.filter((b) => !b.movil).map((b) => b.z + b.d)) * MM; // fondo de la caja
  const frenteF = Math.max(...solidos.map((b) => b.z + b.d)) * MM; // hasta la cara de las puertas
  let yMax = tope;
  let yMin = 0;

  switch (mueble) {
    case "bajo_cocina": {
      g.add(meson(A, frenteF + 0.02, tope, 0.03, true));
      if (A >= 0.5) g.add(frutero(A * 0.18, tope + 0.03, cuerpoF * 0.5));
      yMax = tope + 0.15;
      break;
    }
    case "aereo_cocina": {
      bajoDeContexto(g, A);
      if (A >= 0.5) g.add(frutero(-A * 0.2, 0.85, 0.3));
      yMin = 0.25;
      yMax = elevacion(mueble) + tope;
      break;
    }
    case "vanitorio": {
      g.add(meson(A + 0.01, frenteF + 0.015, tope, 0.02));
      g.add(lavamanos(0, tope + 0.02, frenteF * 0.52));
      const r = Math.min(0.32, A * 0.36);
      g.add(espejo(0, tope + 0.42 + r, r));
      yMax = tope + 0.46 + 2 * r;
      break;
    }
    case "mueble_tv": {
      const anchoTv = Math.min(1.45, Math.max(0.7, A * 0.68));
      const yc = tope + 0.2 + (anchoTv * 0.575) / 2;
      g.add(televisor(anchoTv, yc));
      g.add(jarron(-A / 2 + 0.16, tope, cuerpoF * 0.5, 0.9));
      const pila = librosApilados(A / 2 - 0.22, tope, cuerpoF * 0.5, 2, 3);
      g.add(pila.grupo);
      g.add(plantita(A / 2 - 0.22, tope + pila.alto, cuerpoF * 0.5, 0.8));
      yMax = yc + (anchoTv * 0.575) / 2 + 0.05;
      break;
    }
    case "escritorio": {
      g.add(portatil(-A * 0.08, tope, cuerpoF * 0.55));
      g.add(lampara(-A / 2 + 0.14, tope, cuerpoF * 0.3, 1.25));
      g.add(taza(A * 0.2, tope, cuerpoF * 0.6));
      g.add(plantita(A / 2 - 0.13, tope, cuerpoF * 0.3, 0.9));
      yMax = tope + 0.45;
      break;
    }
    case "mesa_noche": {
      g.add(lampara(-A * 0.14, tope, cuerpoF * 0.42, 1.15));
      const pila = librosApilados(A * 0.2, tope, cuerpoF * 0.55, 2, 5);
      pila.grupo.scale.setScalar(0.8);
      g.add(pila.grupo);
      yMax = tope + 0.45;
      break;
    }
    case "cajonera":
    case "zapatero": {
      g.add(jarron(-A * 0.26, tope, cuerpoF * 0.5, 1.05));
      if (A > 0.6) g.add(marco(A * 0.22, tope, 0.03, 0.24, 0.32, "#c98b5e"));
      const pila = librosApilados(A * 0.02, tope, cuerpoF * 0.5, 2, 4);
      if (A > 0.75) g.add(pila.grupo);
      const r = Math.min(0.3, A * 0.33);
      g.add(espejo(0, tope + 0.5 + r, r));
      yMax = tope + 0.55 + 2 * r;
      break;
    }
    case "librero": {
      decorarRepisas(g, modelo, X);
      if (tope < 1.5) {
        g.add(plantita(-A * 0.25, tope, cuerpoF * 0.5, 1.2));
        yMax = tope + 0.3;
      }
      break;
    }
    case "closet": {
      decorarCloset(g, modelo, X);
      break;
    }
  }
  return { grupo: g, yMax, yMin };
}
