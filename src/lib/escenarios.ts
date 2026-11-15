// Ambientes para la vista 3D, hechos 100 % con código: estudio, habitación y sala.
// Unidades en metros. La pared está en z = 0 y el mueble centrado en x = 0.

import * as THREE from "three";

export type Escenario = "estudio" | "habitacion" | "sala";

export const ESCENARIOS: { id: Escenario; nombre: string }[] = [
  { id: "estudio", nombre: "Estudio" },
  { id: "habitacion", nombre: "Habitación" },
  { id: "sala", nombre: "Sala" },
];

function lienzo(w: number, h: number, dibujar: (g: CanvasRenderingContext2D, azar: () => number) => void, repetir: [number, number]) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  let semilla = 11;
  const azar = () => {
    semilla = (semilla * 16807) % 2147483647;
    return semilla / 2147483647;
  };
  dibujar(g, azar);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repetir);
  t.anisotropy = 8;
  return t;
}

/** Piso de tablas de madera. */
function texturaPisoMadera() {
  return lienzo(
    1024,
    1024,
    (g, azar) => {
      const tablas = 8;
      const alto = 1024 / tablas;
      for (let i = 0; i < tablas; i++) {
        let x = -azar() * 600;
        while (x < 1024) {
          const largo = 500 + azar() * 500;
          const tono = 150 + azar() * 40;
          g.fillStyle = `rgb(${tono}, ${tono * 0.72}, ${tono * 0.48})`;
          g.fillRect(x, i * alto, largo, alto);
          g.globalAlpha = 0.18;
          for (let k = 0; k < 14; k++) {
            g.strokeStyle = `rgb(${tono * 0.6}, ${tono * 0.42}, ${tono * 0.28})`;
            g.lineWidth = 0.6 + azar() * 1.5;
            const y = i * alto + azar() * alto;
            g.beginPath();
            g.moveTo(x, y);
            g.bezierCurveTo(x + largo * 0.3, y + (azar() - 0.5) * 8, x + largo * 0.7, y + (azar() - 0.5) * 8, x + largo, y);
            g.stroke();
          }
          g.globalAlpha = 1;
          g.fillStyle = "rgba(40,25,15,0.55)";
          g.fillRect(x, i * alto, 2, alto);
          x += largo;
        }
        g.fillStyle = "rgba(40,25,15,0.5)";
        g.fillRect(0, i * alto, 1024, 2);
      }
    },
    [11, 11],
  );
}

/** Porcelanato claro en baldosas grandes. */
function texturaPisoBaldosa() {
  return lienzo(
    1024,
    1024,
    (g, azar) => {
      const n = 2;
      const t = 1024 / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const tono = 214 + azar() * 10;
          g.fillStyle = `rgb(${tono}, ${tono - 4}, ${tono - 10})`;
          g.fillRect(i * t, j * t, t, t);
          for (let k = 0; k < 900; k++) {
            g.fillStyle = `rgba(120,110,100,${azar() * 0.08})`;
            g.fillRect(i * t + azar() * t, j * t + azar() * t, 2 + azar() * 6, 1 + azar() * 3);
          }
        }
      g.fillStyle = "#b9b2a8";
      for (let i = 0; i <= n; i++) {
        g.fillRect(i * t - 2, 0, 4, 1024);
        g.fillRect(0, i * t - 2, 1024, 4);
      }
    },
    [10, 10],
  );
}

/** Tela con trama fina (sofá, cama, tapete). */
function texturaTela(color: string, rayas = false) {
  return lienzo(
    256,
    256,
    (g, azar) => {
      g.fillStyle = color;
      g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 2) {
        g.fillStyle = `rgba(0,0,0,${0.03 + azar() * 0.04})`;
        g.fillRect(0, y, 256, 1);
      }
      for (let x = 0; x < 256; x += 2) {
        g.fillStyle = `rgba(255,255,255,${0.02 + azar() * 0.03})`;
        g.fillRect(x, 0, 1, 256);
      }
      if (rayas) {
        g.fillStyle = "rgba(255,255,255,0.35)";
        for (let x = 20; x < 256; x += 64) g.fillRect(x, 0, 10, 256);
      }
    },
    [4, 4],
  );
}

function caja(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, sombra = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = sombra;
  m.receiveShadow = true;
  return m;
}

/** Caja con esquinas redondeadas (cojines, colchón). */
function cojin(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) {
  const r = Math.min(w, h, d) * 0.35;
  const forma = new THREE.Shape();
  const ww = w / 2 - r, hh = h / 2 - r;
  forma.moveTo(-ww, -h / 2);
  forma.lineTo(ww, -h / 2);
  forma.quadraticCurveTo(w / 2, -h / 2, w / 2, -hh);
  forma.lineTo(w / 2, hh);
  forma.quadraticCurveTo(w / 2, h / 2, ww, h / 2);
  forma.lineTo(-ww, h / 2);
  forma.quadraticCurveTo(-w / 2, h / 2, -w / 2, hh);
  forma.lineTo(-w / 2, -hh);
  forma.quadraticCurveTo(-w / 2, -h / 2, -ww, -h / 2);
  const geo = new THREE.ExtrudeGeometry(forma, { depth: d - r, bevelEnabled: true, bevelThickness: r / 2, bevelSize: r / 2, bevelSegments: 4, curveSegments: 6 });
  geo.translate(0, 0, -(d - r) / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function planta(x: number, z: number, escala = 1) {
  const g = new THREE.Group();
  const maceta = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * escala, 0.12 * escala, 0.32 * escala, 28), new THREE.MeshStandardMaterial({ color: "#d8d2c8", roughness: 0.7 }));
  maceta.position.y = 0.16 * escala;
  maceta.castShadow = true;
  g.add(maceta);
  const hoja = new THREE.MeshStandardMaterial({ color: "#4f7a48", roughness: 0.75 });
  const hoja2 = new THREE.MeshStandardMaterial({ color: "#3d6339", roughness: 0.75 });
  let semilla = 3;
  const azar = () => {
    semilla = (semilla * 16807) % 2147483647;
    return semilla / 2147483647;
  };
  for (let i = 0; i < 26; i++) {
    const a = azar() * Math.PI * 2;
    const r = azar() * 0.22 * escala;
    const y = (0.45 + azar() * 0.75) * escala;
    const s = new THREE.Mesh(new THREE.SphereGeometry((0.09 + azar() * 0.08) * escala, 10, 8), i % 2 ? hoja : hoja2);
    s.scale.set(1, 0.6 + azar() * 0.6, 1);
    s.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    s.castShadow = true;
    g.add(s);
  }
  g.position.set(x, 0, z);
  return g;
}

function cuadro(x: number, y: number, w: number, h: number, colores: string[]) {
  const g = new THREE.Group();
  g.add(caja(w, h, 0.03, new THREE.MeshStandardMaterial({ color: "#2b2b2b", roughness: 0.5 }), 0, 0, 0.015, false));
  const t = lienzo(
    256,
    Math.round((256 * h) / w),
    (ctx) => {
      ctx.fillStyle = "#f4f1ea";
      ctx.fillRect(0, 0, 256, 512);
      colores.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(70 + i * 55, 90 + (i % 2) * 60, 55 - i * 8, 0, Math.PI * 2);
        ctx.fill();
      });
    },
    [1, 1],
  );
  const lam = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, h * 0.86), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
  lam.position.z = 0.031;
  g.add(lam);
  g.position.set(x, y, 0);
  return g;
}

function baseHabitacion(colorPared: string, piso: THREE.Texture | string, colorRodapie: string) {
  const g = new THREE.Group();
  const matPiso =
    typeof piso === "string" ? new THREE.MeshStandardMaterial({ color: piso, roughness: 0.85 }) : new THREE.MeshStandardMaterial({ map: piso, roughness: 0.55 });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), matPiso);
  p.rotation.x = -Math.PI / 2;
  p.position.z = 7;
  p.receiveShadow = true;
  g.add(p);
  const pared = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshStandardMaterial({ color: colorPared, roughness: 0.95 }));
  pared.position.set(0, 3, -0.004);
  pared.receiveShadow = true;
  g.add(pared);
  g.add(caja(14, 0.08, 0.012, new THREE.MeshStandardMaterial({ color: colorRodapie, roughness: 0.6 }), 0, 0.04, 0.002, false));
  return g;
}

/**
 * Construye el ambiente. anchoMueble y altoMueble en metros, para ubicar la decoración a los lados.
 */
export function crearEscenario(tipo: Escenario, anchoMueble: number, altoMueble: number) {
  const W = anchoMueble;
  const lado = W / 2 + 0.35;
  if (tipo === "habitacion") {
    const g = baseHabitacion("#e6dbcd", texturaPisoMadera(), "#f4efe8");
    // cama a la derecha, cabecera contra la pared
    const anchoCama = 1.4, largoCama = 1.95;
    const xc = lado + anchoCama / 2 + 0.75;
    const madera = new THREE.MeshStandardMaterial({ color: "#8a6446", roughness: 0.6 });
    g.add(caja(anchoCama + 0.06, 0.28, largoCama, madera, xc, 0.2, largoCama / 2 + 0.06));
    g.add(caja(anchoCama + 0.1, 1.0, 0.06, new THREE.MeshStandardMaterial({ map: texturaTela("#9aa59a"), roughness: 0.95 }), xc, 0.5, 0.03));
    g.add(cojin(anchoCama, 0.22, largoCama - 0.05, new THREE.MeshStandardMaterial({ color: "#f3f1ec", roughness: 0.95 }), xc, 0.45, largoCama / 2 + 0.08));
    g.add(cojin(anchoCama + 0.04, 0.06, largoCama * 0.55, new THREE.MeshStandardMaterial({ map: texturaTela("#c9b49a", true), roughness: 0.95 }), xc, 0.58, largoCama * 0.68));
    g.add(cojin(0.55, 0.14, 0.32, new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.95 }), xc - 0.33, 0.62, 0.3));
    g.add(cojin(0.55, 0.14, 0.32, new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.95 }), xc + 0.33, 0.62, 0.3));
    // tapete
    const tap = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.4), new THREE.MeshStandardMaterial({ map: texturaTela("#b9a58c"), roughness: 1 }));
    tap.rotation.x = -Math.PI / 2;
    tap.position.set(xc - 0.2, 0.003, largoCama * 0.6);
    tap.receiveShadow = true;
    g.add(tap);
    // planta y cuadro a la izquierda
    g.add(planta(-lado - 0.45, 0.3, 1.0));
    g.add(cuadro(-lado - 0.45, Math.max(1.5, altoMueble * 0.75), 0.6, 0.8, ["#c98b5e", "#7a8f84", "#e2c7a4"]));
    return { grupo: g, fondo: "#e6dbcd" };
  }
  if (tipo === "sala") {
    const g = baseHabitacion("#d6dbd3", texturaPisoBaldosa(), "#eceee9");
    // sofá a la izquierda
    const anchoSofa = 2.0, prof = 0.9;
    const xs = -(lado + anchoSofa / 2 + 0.35);
    const tela = new THREE.MeshStandardMaterial({ map: texturaTela("#7d8a95"), roughness: 0.95 });
    const tela2 = new THREE.MeshStandardMaterial({ map: texturaTela("#8a97a1"), roughness: 0.95 });
    g.add(caja(anchoSofa, 0.22, prof, tela, xs, 0.2, prof / 2 + 0.05));
    g.add(cojin(0.2, 0.62, prof, tela, xs - anchoSofa / 2 + 0.1, 0.4, prof / 2 + 0.05));
    g.add(cojin(0.2, 0.62, prof, tela, xs + anchoSofa / 2 - 0.1, 0.4, prof / 2 + 0.05));
    g.add(cojin(anchoSofa - 0.4, 0.5, 0.22, tela2, xs, 0.62, 0.17));
    for (const k of [-0.4, 0.4]) g.add(cojin(0.78, 0.16, prof - 0.25, tela2, xs + k, 0.39, prof / 2 + 0.15));
    g.add(cojin(0.42, 0.38, 0.12, new THREE.MeshStandardMaterial({ map: texturaTela("#d9a066"), roughness: 0.95 }), xs - 0.55, 0.62, 0.36));
    for (const dx of [-anchoSofa / 2 + 0.12, anchoSofa / 2 - 0.12])
      for (const dz of [0.12, prof - 0.04]) {
        const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.09, 12), new THREE.MeshStandardMaterial({ color: "#3a2a20" }));
        pata.position.set(xs + dx, 0.045, dz);
        g.add(pata);
      }
    // tapete y mesa de centro
    const tap = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.8), new THREE.MeshStandardMaterial({ map: texturaTela("#e3dccf", true), roughness: 1 }));
    tap.rotation.x = -Math.PI / 2;
    tap.position.set(xs + 0.6, 0.003, 1.5);
    tap.receiveShadow = true;
    g.add(tap);
    const mesa = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 40), new THREE.MeshStandardMaterial({ color: "#a4795a", roughness: 0.5 }));
    mesa.position.set(xs + 0.4, 0.4, 1.55);
    mesa.castShadow = true;
    g.add(mesa);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.18, 0.38, 24), new THREE.MeshStandardMaterial({ color: "#2d2d2d", roughness: 0.5 }));
    base.position.set(xs + 0.4, 0.19, 1.55);
    base.castShadow = true;
    g.add(base);
    // lámpara de pie a la derecha
    const metal = new THREE.MeshStandardMaterial({ color: "#1f1f1f", metalness: 0.6, roughness: 0.4 });
    const xl = lado + 0.3;
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.55, 12), metal);
    poste.position.set(xl, 0.78, 0.35);
    poste.castShadow = true;
    g.add(poste);
    const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 30), metal);
    pie.position.set(xl, 0.01, 0.35);
    g.add(pie);
    const pantalla = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 0.3, 32, 1, true),
      new THREE.MeshStandardMaterial({ color: "#f1e6d2", roughness: 0.9, side: THREE.DoubleSide, emissive: "#ffdca8", emissiveIntensity: 0.35 }),
    );
    pantalla.position.set(xl, 1.62, 0.35);
    g.add(pantalla);
    g.add(planta(xl + 0.5, 0.3, 1.25));
    g.add(cuadro(xs, 1.55, 1.1, 0.7, ["#3f5e6b", "#d9a066", "#9fb0a3"]));
    return { grupo: g, fondo: "#d6dbd3" };
  }
  const g = baseHabitacion("#efebe5", "#cfc6b8", "#f6f4f0");
  return { grupo: g, fondo: "#e8e4de" };
}
