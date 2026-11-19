"use client";
// Vista isométrica explotada: cada pieza separada de su lugar, con líneas punteadas hasta su código de corte
// (el mismo de la lista de cortes) y los herrajes nombrados. Se dibuja fuera de pantalla y sale como imagen.

import * as THREE from "three";
import { piezasInterior } from "./motor/interior";
import { ACABADOS_DEFECTO, acabado, type AcabadosItem } from "./acabados";
import { modelo3d, type Bloque } from "./motor/modelo3d";
import type { Configuracion, ResultadoMueble } from "./motor/tipos";

const MM = 0.001;

const HERRAJES: Record<string, string> = {
  jaladera: "Jaladera",
  bisagra: "Bisagra de cazoleta 35 mm",
  corredera: "Corredera telescópica",
  pata: "Pata niveladora",
  rodachina: "Rodachina",
  led: "Perfil con cinta LED",
  tubo: "Tubo colgador",
};

interface Etiqueta {
  texto: string;
  ancla: THREE.Vector3;
  herraje: boolean;
}

/** Desplazamiento de cada bloque en la vista explotada (en mm). */
function desplazamientos(bloques: Bloque[], A: number, H: number, F: number) {
  const C = new THREE.Vector3(A / 2, H / 2, F / 2);
  const base = bloques.map((b) => {
    const c = new THREE.Vector3(b.x + b.w / 2, b.y + b.h / 2, b.z + b.d / 2);
    const d = c.clone().sub(C).multiply(new THREE.Vector3(0.8, 0.65, 0.3));
    if (b.tipo === "frente" && b.movil) d.z += F * 0.9;
    if (b.tipo === "fondo") d.z -= F * 0.55;
    if (b.piezaId === "pata" || b.piezaId === "rodachina" || b.piezaId === "rodachina_base") d.y -= 60;
    return d;
  });
  // jaladeras, bisagras de la puerta y cajas de cajón viajan con su frente
  return bloques.map((b, i) => (b.padre !== undefined ? base[b.padre].clone().add(new THREE.Vector3(0, 0, b.piezaId === "jaladera" ? 60 : b.piezaId === "bisagra" ? -40 : -F * 0.35)) : base[i]));
}

export async function vistaExplotada(res: ResultadoMueble, fondo: number, config: Configuracion, codigos: Record<string, string>, acabados: AcabadosItem = ACABADOS_DEFECTO, muebleId = ""): Promise<string | null> {
  const modelo = modelo3d(res, fondo, config, piezasInterior(res, muebleId, acabados));
  const { bloques } = modelo;
  const A = modelo.ancho, H = modelo.alto, F = fondo;
  const W = 1400, Hc = 1250; // tamaño del dibujo 3D
  const lienzo3d = document.createElement("canvas");
  lienzo3d.width = W;
  lienzo3d.height = Hc;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: lienzo3d, antialias: true, preserveDrawingBuffer: true, alpha: false });
  } catch {
    return null;
  }
  try {
    renderer.setPixelRatio(1);
    renderer.setSize(W, Hc, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#ffffff");
    scene.add(new THREE.HemisphereLight("#ffffff", "#c9c2b8", 1.6));
    const luz = new THREE.DirectionalLight("#ffffff", 1.6);
    luz.position.set(-2, 4, 3);
    scene.add(luz);

    const color = (b: Bloque) => {
      if (b.tipo === "frente") return acabado(acabados.frente).base;
      if (b.tipo === "fondo") return "#d9c7a8";
      if (b.tipo === "metal") return "#8b9097";
      if (b.tipo === "luz") return "#ffe7a8";
      if (b.tipo === "interior") return acabado("blanco").base;
      return acabado(acabados.cuerpo).base;
    };
    const mats = new Map<string, THREE.Material>();
    const mat = (c: string) => {
      if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: c }));
      return mats.get(c)!;
    };
    const lineaMat = new THREE.LineBasicMaterial({ color: "#2b2118" });
    const desp = desplazamientos(bloques, A, H, F);
    const caja = new THREE.Box3();
    const centros: THREE.Vector3[] = [];
    bloques.forEach((b, i) => {
      let geo: THREE.BufferGeometry;
      if (b.forma === "cilindro_v") geo = new THREE.CylinderGeometry((b.w / 2) * MM, (b.w / 2) * MM, b.h * MM, 16);
      else if (b.forma === "cilindro_h") {
        geo = new THREE.CylinderGeometry((b.h / 2) * MM, (b.h / 2) * MM, b.w * MM, 16);
        geo.rotateZ(Math.PI / 2);
      } else geo = new THREE.BoxGeometry(b.w * MM, b.h * MM, b.d * MM);
      const m = new THREE.Mesh(geo, mat(color(b)));
      const c = new THREE.Vector3(b.x + b.w / 2, b.y + b.h / 2, b.z + b.d / 2).add(desp[i]).multiplyScalar(MM);
      m.position.copy(c);
      scene.add(m);
      if (b.forma === "caja" && b.tipo !== "metal") {
        const borde = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineaMat);
        borde.position.copy(c);
        scene.add(borde);
      }
      caja.expandByObject(m);
      centros.push(c);
    });

    // Cámara isométrica desde arriba, adelante y a la izquierda
    const centro = caja.getCenter(new THREE.Vector3());
    const tam = caja.getSize(new THREE.Vector3()).length();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
    cam.position.copy(centro).add(new THREE.Vector3(-1, 0.85, 1.25).normalize().multiplyScalar(tam * 2));
    cam.lookAt(centro);
    cam.updateMatrixWorld();
    // encuadre: proyectar las esquinas de la caja y ajustar el frustum
    const esquinas: THREE.Vector3[] = [];
    for (const x of [caja.min.x, caja.max.x]) for (const y of [caja.min.y, caja.max.y]) for (const z of [caja.min.z, caja.max.z]) esquinas.push(new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse));
    const minX = Math.min(...esquinas.map((v) => v.x)), maxX = Math.max(...esquinas.map((v) => v.x));
    const minY = Math.min(...esquinas.map((v) => v.y)), maxY = Math.max(...esquinas.map((v) => v.y));
    const aspecto = W / Hc;
    let ancho = (maxX - minX) * 1.08, alto = (maxY - minY) * 1.08;
    if (ancho / alto > aspecto) alto = ancho / aspecto;
    else ancho = alto * aspecto;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    cam.left = cx - ancho / 2;
    cam.right = cx + ancho / 2;
    cam.top = cy + alto / 2;
    cam.bottom = cy - alto / 2;
    cam.updateProjectionMatrix();
    renderer.render(scene, cam);

    // Etiquetas: una por pieza del despiece y una por tipo de herraje
    const etiquetas: Etiqueta[] = [];
    const vistas = new Set<string>();
    bloques.forEach((b, i) => {
      if (b.piezaId === "rodachina_base") return;
      let texto: string | null = null;
      let herraje = false;
      if (HERRAJES[b.piezaId]) {
        texto = HERRAJES[b.piezaId];
        herraje = true;
      } else if (b.piezaId === "cajon_caja") texto = codigos.__caja ?? "Caja de cajón";
      else if (codigos[b.piezaId]) texto = codigos[b.piezaId];
      if (!texto || vistas.has(texto)) return;
      vistas.add(texto);
      etiquetas.push({ texto, ancla: centros[i], herraje });
    });

    // Composición final: dibujo al centro y etiquetas a los lados con líneas punteadas
    const margen = 330;
    const final = document.createElement("canvas");
    final.width = W + margen * 2;
    final.height = Hc;
    const g = final.getContext("2d")!;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, final.width, final.height);
    g.drawImage(lienzo3d, margen, 0);
    const proyectar = (v: THREE.Vector3) => {
      const p = v.clone().project(cam);
      return { x: margen + ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * Hc };
    };
    const puntos = etiquetas.map((e) => ({ ...e, p: proyectar(e.ancla) }));
    const lados = { izq: puntos.filter((e) => e.p.x < margen + W / 2), der: puntos.filter((e) => e.p.x >= margen + W / 2) };
    // equilibrar: si un lado queda muy cargado, pasar las más cercanas al centro
    while (Math.abs(lados.izq.length - lados.der.length) > 2) {
      const [mas, menos] = lados.izq.length > lados.der.length ? [lados.izq, lados.der] : [lados.der, lados.izq];
      mas.sort((a, b) => Math.abs(a.p.x - margen - W / 2) - Math.abs(b.p.x - margen - W / 2));
      menos.push(mas.shift()!);
    }
    g.font = "600 25px Montserrat, Helvetica, Arial, sans-serif";
    const paso = 64;
    for (const [lado, lista] of Object.entries(lados) as ["izq" | "der", typeof puntos][]) {
      lista.sort((a, b) => a.p.y - b.p.y);
      // repartir en alto sin que se pisen
      const ys: number[] = [];
      lista.forEach((e, i) => ys.push(Math.max(e.p.y, i ? ys[i - 1] + paso : 40)));
      const exceso = (ys[ys.length - 1] ?? 0) - (Hc - 30);
      if (exceso > 0) for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.min(ys[i] - exceso, i < ys.length - 1 ? ys[i + 1] - paso : Hc - 30);
      lista.forEach((e, i) => {
        const y = Math.max(30, ys[i]);
        const xTexto = lado === "izq" ? margen - 12 : margen + W + 12;
        g.strokeStyle = e.herraje ? "#1d4ed8" : "#5a3c1e";
        g.lineWidth = 2;
        g.setLineDash([7, 6]);
        g.beginPath();
        g.moveTo(e.p.x, e.p.y);
        g.lineTo(lado === "izq" ? margen + 10 : margen + W - 10, y);
        g.lineTo(xTexto + (lado === "izq" ? 6 : -6), y);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = e.herraje ? "#1d4ed8" : "#5a3c1e";
        g.beginPath();
        g.arc(e.p.x, e.p.y, 6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = e.herraje ? "#1d4ed8" : "#0b1f3a";
        g.textAlign = lado === "izq" ? "right" : "left";
        g.textBaseline = "middle";
        // cortar textos largos en dos líneas
        const palabras = e.texto.split(" ");
        let l1 = "", l2 = "";
        for (const w of palabras) {
          if (!l2 && g.measureText(`${l1} ${w}`).width < margen - 30) l1 = l1 ? `${l1} ${w}` : w;
          else l2 = l2 ? `${l2} ${w}` : w;
        }
        if (l2) {
          g.fillText(l1, xTexto, y - 13);
          g.fillText(l2, xTexto, y + 15);
        } else g.fillText(l1, xTexto, y);
      });
    }
    return final.toDataURL("image/jpeg", 0.9);
  } catch {
    return null;
  } finally {
    renderer.dispose();
  }
}

/** Códigos de corte de las piezas de un mueble (1.01 Lateral ×2…) para nombrar cada parte en la vista explotada. */
export function codigosMueble(res: ResultadoMueble, indice: number) {
  const out: Record<string, string> = {};
  res.piezas.forEach((p, j) => {
    const cod = `${indice + 1}.${String(j + 1).padStart(2, "0")}`;
    out[p.id] = `${cod} ${p.nombre}${p.cantidad > 1 ? ` ×${p.cantidad}` : ""}`;
  });
  const caja = res.piezas
    .map((p, j) => ({ p, cod: `${indice + 1}.${String(j + 1).padStart(2, "0")}` }))
    .filter(({ p }) => /_(costado|contra|piso)$/.test(p.id) && p.id.includes("cajon"));
  if (caja.length) out.__caja = `Caja de cajón (${caja.map((c) => c.cod).join(", ")})`;
  return out;
}
