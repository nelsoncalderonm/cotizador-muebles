"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { crearDecoracion, elevacion } from "@/lib/decoracion";
import { acabado, jaladera, type Acabado, type AcabadosItem } from "@/lib/acabados";
import type { Bloque, Modelo3D } from "@/lib/motor/modelo3d";
import { crearEscenario, type Escenario } from "@/lib/escenarios";

const MM = 0.001;

/** Mosaico de la textura: 0,6 m a través de la veta y 1,2 m a lo largo. */
const TEX_ANCHO = 0.6, TEX_LARGO = 1.2;

/**
 * Textura procedural (sin imágenes) que se repite sin costuras: veta de madera o melamina lisa con poro fino.
 * Devuelve el color y un relieve para que la luz marque la veta.
 */
function texturaAcabado(a: Acabado) {
  const W = 1024, H = 2048;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const cr = document.createElement("canvas"); // relieve
  cr.width = W / 2;
  cr.height = H / 2;
  const gr = cr.getContext("2d")!;
  gr.fillStyle = "#808080";
  gr.fillRect(0, 0, cr.width, cr.height);
  gr.scale(0.5, 0.5);
  g.fillStyle = a.base;
  g.fillRect(0, 0, W, H);
  let semilla = 7;
  const azar = () => {
    semilla = (semilla * 16807) % 2147483647;
    return semilla / 2147483647;
  };
  const TAU = Math.PI * 2;
  if (a.veta) {
    const base = new THREE.Color(a.base);
    const claro = base.clone().lerp(new THREE.Color("#ffffff"), 0.12);
    const oscuro = base.clone().lerp(new THREE.Color(a.veta), 0.55);
    // franjas de tono a lo ancho (periódicas, para que no se note la repetición)
    for (let x = 0; x < W; x += 2) {
      const u = (x / W) * TAU;
      const t = 0.5 + 0.28 * Math.sin(u * 2 + 1.3) + 0.16 * Math.sin(u * 5 + 0.4) + 0.08 * Math.sin(u * 11 + 2.1);
      g.fillStyle = `#${claro.clone().lerp(oscuro, THREE.MathUtils.clamp(t, 0, 1) * 0.5).getHexString()}`;
      g.fillRect(x, 0, 2, H);
    }
    // vetas largas: ondulación periódica en el largo y dibujo repetido a los lados para cerrar la costura
    const linea = (ctx: CanvasRenderingContext2D, x0: number, amp: number, n1: number, n2: number, f1: number, f2: number) => {
      for (const dx of [-W, 0, W]) {
        ctx.beginPath();
        for (let y = 0; y <= H; y += 8) {
          const v = (y / H) * TAU;
          const x = x0 + dx + Math.sin(v * n1 + f1) * amp + Math.sin(v * n2 + f2) * amp * 0.35;
          if (y === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };
    // las vetas se agrupan en "catedrales": zonas con vetas juntas y zonas más limpias
    for (let i = 0; i < 230; i++) {
      const grupo = Math.floor(azar() * 7);
      const centro = ((grupo + 0.5) / 7) * W;
      const x0 = azar() < 0.7 ? centro + (azar() - 0.5) * W * 0.16 : azar() * W;
      const ancho = 0.5 + azar() * 2.4;
      const amp = 3 + azar() * 9 + grupo * 1.5;
      const n1 = 1 + Math.floor(azar() * 2), n2 = 3 + Math.floor(azar() * 3);
      const f1 = grupo * 1.7 + azar() * 0.5, f2 = azar() * TAU;
      const alfa = 0.07 + azar() * 0.3;
      g.strokeStyle = a.veta;
      g.globalAlpha = alfa;
      g.lineWidth = ancho;
      linea(g, x0, amp, n1, n2, f1, f2);
      gr.strokeStyle = "#000";
      gr.globalAlpha = alfa * 0.9;
      gr.lineWidth = ancho + 0.5;
      linea(gr, x0, amp, n1, n2, f1, f2);
    }
    // poros alargados en el sentido de la veta
    g.fillStyle = a.veta;
    gr.fillStyle = "#000";
    for (let i = 0; i < 9000; i++) {
      const x = azar() * W, y = azar() * H, l = 4 + azar() * 12;
      g.globalAlpha = 0.05 + azar() * 0.1;
      g.fillRect(x, y, 1, l);
      gr.globalAlpha = 0.25;
      gr.fillRect(x, y, 1.5, l);
    }
  } else {
    // melamina lisa: poro muy fino tipo "cáscara"
    gr.fillStyle = "#000";
    for (let i = 0; i < 14000; i++) {
      gr.globalAlpha = 0.06 + azar() * 0.1;
      gr.fillRect(azar() * W, azar() * H, 2, 2);
    }
  }
  g.globalAlpha = 1;
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (azar() - 0.5) * (a.veta ? 12 : 5);
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const preparar = (t: THREE.CanvasTexture, color: boolean) => {
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  return { mapa: preparar(new THREE.CanvasTexture(c), true), relieve: preparar(new THREE.CanvasTexture(cr), false) };
}

/**
 * Tablero con cantos levemente redondeados (como el canto PVC real) y UV en escala real:
 * la veta mide lo mismo en todas las piezas y sigue su lado largo. `desfase` evita que todas las piezas repitan la misma veta.
 */
function cajaConUV(w: number, h: number, d: number, desfase = 0, horizontal?: boolean) {
  const radio = Math.min(0.0015, w / 2.2, h / 2.2, d / 2.2);
  const geo = new RoundedBoxGeometry(w, h, d, 2, radio);
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv as THREE.BufferAttribute;
  const vetaHorizontal = horizontal ?? w > h;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    let a: number, b: number; // a = través de la veta, b = a lo largo
    if (nz >= nx && nz >= ny) [a, b] = vetaHorizontal ? [y, x] : [x, y];
    else if (nx >= ny) [a, b] = vetaHorizontal ? [y, z] : [z, y];
    else [a, b] = vetaHorizontal ? [z, x] : [x, z];
    uv.setXY(i, a / TEX_ANCHO + desfase, b / TEX_LARGO + desfase * 0.37);
  }
  uv.needsUpdate = true;
  return geo;
}

/** Jaladera tipo barra con dos soportes. La barra queda al frente (z máximo) del volumen dado. */
function geoJaladera(w: number, h: number, d: number) {
  const vertical = h > w;
  const largo = vertical ? h : w;
  const grosor = Math.min(vertical ? w : h, 0.011);
  const barra = new RoundedBoxGeometry(vertical ? grosor : largo, vertical ? largo : grosor, grosor, 3, grosor * 0.45);
  barra.translate(0, 0, d / 2 - grosor / 2);
  const partes: THREE.BufferGeometry[] = [barra];
  for (const lado of [-1, 1]) {
    const poste = new THREE.CylinderGeometry(grosor * 0.36, grosor * 0.36, d - grosor * 0.5, 12);
    poste.rotateX(Math.PI / 2);
    const desp = lado * largo * 0.33;
    poste.translate(vertical ? 0 : desp, vertical ? desp : 0, -grosor * 0.25);
    partes.push(poste);
  }
  const geo = mergeGeometries(partes.map((p) => (p.index ? p.toNonIndexed() : p)))!;
  partes.forEach((p) => p.dispose());
  return geo;
}

interface Escena {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  grupo: THREE.Group;
  luz: THREE.DirectionalLight;
  moviles: { obj: THREE.Object3D; clase: "puerta" | "cajon"; signo: number; orden: number; recorrido: number }[];
  abierto: boolean;
  ambiente: THREE.Group;
  decoracion: THREE.Group;
  /** Pide un cuadro nuevo: solo se dibuja cuando algo cambia (ahorra batería en el celular). */
  pedir: () => void;
  ultimoTamano: number;
  texturas: THREE.Texture[];
}

interface Props {
  modelo: Modelo3D;
  acabados: AcabadosItem;
  abierto: boolean;
  escenario?: Escenario;
  /** Id del mueble en el catálogo: define la decoración y si va colgado. */
  mueble?: string;
  decorar?: boolean;
  onListo?: (capturar: () => Blob | null) => void;
}

export function Vista3D({ modelo, acabados, abierto, escenario = "estudio", mueble = "", decorar = true, onListo }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const escena = useRef<Escena | null>(null);
  const [sinWebgl, setSinWebgl] = useState(false);

  // Inicializar una sola vez
  useEffect(() => {
    const el = contenedor.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch {
      setSinWebgl(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.NeutralToneMapping; // conserva el color real de los tableros
    renderer.toneMappingExposure = 1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e8e4de");
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.62;

    const ambiente = new THREE.Group();
    scene.add(ambiente);

    scene.add(new THREE.HemisphereLight("#ffffff", "#b8a890", 0.32));
    const luz = new THREE.DirectionalLight("#fff3e2", 2.0);
    luz.castShadow = true;
    luz.shadow.mapSize.set(2048, 2048);
    luz.shadow.bias = -0.0004;
    luz.shadow.normalBias = 0.02;
    luz.shadow.radius = 4;
    scene.add(luz);
    scene.add(luz.target);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.2, 40);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minAzimuthAngle = -Math.PI / 2.3;
    controls.maxAzimuthAngle = Math.PI / 2.3;

    const grupo = new THREE.Group();
    scene.add(grupo);
    const decoracion = new THREE.Group();
    scene.add(decoracion);

    // Posproceso: oclusión ambiental (sombras suaves en rincones, juntas y bajo el mueble) + salida con tono de cine
    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
    composer.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, 1, 1);
    ao.blendIntensity = 1;
    ao.updateGtaoMaterial({ radius: 0.24, distanceExponent: 1, thickness: 0.6, scale: 1.3, samples: 16, screenSpaceRadius: false });
    // Las superficies planas lejanas reciben un velo leve de sombra falsa (error de medio píxel); se descuenta para no dejar halos
    ao.gtaoMaterial.fragmentShader = ao.gtaoMaterial.fragmentShader.replace("ao = pow(ao, scale);", "ao = pow(clamp(ao * 1.07, 0., 1.), scale);");
    ao.gtaoMaterial.needsUpdate = true;
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 12, rings: 2, samples: 16 });
    composer.addPass(ao);
    composer.addPass(new OutputPass());
    let calidad = "auto";
    try {
      calidad = localStorage.getItem("inner-muebles:calidad") ?? "auto";
    } catch {
      /* sin almacenamiento */
    }
    ao.enabled = calidad !== "baja";

    let sucio = true;
    const pedir = () => {
      sucio = true;
    };
    controls.addEventListener("change", pedir);

    const s: Escena = { renderer, scene, camera, controls, grupo, luz, moviles: [], abierto: false, ambiente, decoracion, pedir, ultimoTamano: 0, texturas: [] };
    escena.current = s;

    const ajustar = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      pedir();
    };
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    ajustar();

    let raf = 0;
    const reloj = new THREE.Clock();
    // Si el equipo no da la talla con la oclusión ambiental, se apaga sola (salvo al guardar la imagen)
    let lentos = 0, medidos = 0;
    const bucle = () => {
      raf = requestAnimationFrame(bucle);
      const dt = Math.min(reloj.getDelta(), 0.05);
      for (const m of s.moviles) {
        if (m.clase === "puerta") {
          const objetivo = s.abierto ? m.signo * THREE.MathUtils.degToRad(105) : 0;
          const falta = objetivo - m.obj.rotation.y;
          if (Math.abs(falta) > 0.0005) {
            m.obj.rotation.y += falta * Math.min(1, dt * 5);
            sucio = true;
          }
        } else {
          const objetivo = s.abierto ? m.recorrido : 0;
          const falta = objetivo - m.obj.position.z;
          if (Math.abs(falta) > 0.00005) {
            m.obj.position.z += falta * Math.min(1, dt * 5);
            sucio = true;
          }
        }
      }
      controls.update();
      if (!sucio) return;
      sucio = false;
      const t0 = performance.now();
      composer.render();
      if (calidad === "auto" && ao.enabled && medidos < 24) {
        renderer.getContext().finish();
        medidos++;
        if (medidos > 4 && performance.now() - t0 > 50) lentos++;
        if (lentos >= 8) {
          ao.enabled = false;
          sucio = true;
        }
      }
    };
    bucle();

    onListo?.(() => {
      const antes = ao.enabled;
      ao.enabled = calidad !== "baja";
    try { const dbg = JSON.parse(localStorage.getItem("dbg-ao") || "null"); if (dbg) { ao.updateGtaoMaterial(dbg); if (dbg.out !== undefined) ao.output = dbg.out; } } catch {}
      composer.render();
      ao.enabled = antes;
      sucio = true;
      const url = renderer.domElement.toDataURL("image/png");
      const bin = atob(url.split(",")[1]);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: "image/png" });
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.removeEventListener("change", pedir);
      controls.dispose();
      composer.dispose();
      ao.dispose();
      s.texturas.forEach((t) => t.dispose());
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss(); // libera el contexto: la cotización dibuja varios muebles seguidos
      el.removeChild(renderer.domElement);
      escena.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconstruir el mueble cuando cambian medidas o acabados
  useEffect(() => {
    const s = escena.current;
    if (!s) return;
    // limpiar
    s.grupo.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    });
    s.grupo.clear();
    s.decoracion.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
    });
    s.decoracion.clear();
    s.texturas.forEach((t) => t.dispose());
    s.texturas = [];
    s.moviles = [];

    const aCuerpo = acabado(acabados.cuerpo);
    const aFrente = acabado(acabados.frente);
    const met = jaladera(acabados.jaladera);
    const tCuerpo = texturaAcabado(aCuerpo);
    const tFrente = aFrente.id === aCuerpo.id ? tCuerpo : texturaAcabado(aFrente);
    s.texturas.push(tCuerpo.mapa, tCuerpo.relieve);
    if (tFrente !== tCuerpo) s.texturas.push(tFrente.mapa, tFrente.relieve);
    // melamina: base mate con una capa muy fina de brillo y el relieve del poro, como el laminado real
    const melamina = (t: { mapa: THREE.Texture; relieve: THREE.Texture }, a: Acabado) =>
      new THREE.MeshPhysicalMaterial({
        map: t.mapa,
        bumpMap: t.relieve,
        bumpScale: a.veta ? 0.9 : 0.35,
        roughness: a.rugosidad,
        metalness: 0,
        clearcoat: a.veta ? 0.06 : 0.14,
        clearcoatRoughness: 0.55,
      });
    const matCuerpo = () => melamina(tCuerpo, aCuerpo);
    const matFrente = () => melamina(tFrente, aFrente);
    const matFondo = () => new THREE.MeshStandardMaterial({ map: tCuerpo.mapa, roughness: 0.8, color: "#d9d4cc" });
    const matMetal = () => new THREE.MeshStandardMaterial({ color: met.color, metalness: met.metal, roughness: met.rugosidad });
    const matPata = () => new THREE.MeshStandardMaterial({ color: "#2a2a2c", roughness: 0.5, metalness: 0.2 });
    const matHerraje = () => new THREE.MeshStandardMaterial({ color: "#c4c7cb", roughness: 0.32, metalness: 0.95 });
    const matLuz = () => new THREE.MeshStandardMaterial({ color: "#fff4d8", emissive: "#ffe2a8", emissiveIntensity: 2.2, roughness: 0.4 });
    const matJunta = () => new THREE.MeshBasicMaterial({ color: "#191512" });

    const { ancho: A, alto: H, fondo: F } = modelo;
    const X = (x: number) => (x - A / 2) * MM;

    let n = 0;
    const malla = (b: Bloque) => {
      let geo: THREE.BufferGeometry;
      if (b.forma === "cilindro_v") geo = new THREE.CylinderGeometry((b.w / 2) * MM, (b.w / 2) * MM * 1.1, b.h * MM, 24);
      else if (b.forma === "cilindro_h") {
        geo = new THREE.CylinderGeometry((b.h / 2) * MM, (b.h / 2) * MM, b.w * MM, 20);
        geo.rotateZ(Math.PI / 2);
      } else if (b.piezaId === "jaladera") geo = geoJaladera(b.w * MM, b.h * MM, b.d * MM);
      else geo = cajaConUV(b.w * MM, b.h * MM, b.d * MM, (n++ * 0.173) % 1, b.movil?.clase === "puerta" ? false : undefined); // en las puertas la veta va vertical
      const metal = b.piezaId === "pata" || b.piezaId === "rodachina" ? matPata() : b.piezaId === "jaladera" ? matMetal() : matHerraje();
      const mat = b.tipo === "frente" ? matFrente() : b.tipo === "fondo" ? matFondo() : b.tipo === "metal" ? metal : b.tipo === "luz" ? matLuz() : matCuerpo();
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = b.tipo !== "fondo";
      m.receiveShadow = true;
      if (b.movil) {
        // línea de sombra alrededor de puertas y cajones: marca la junta entre frentes como en un mueble real
        const junta = new THREE.Mesh(new THREE.BoxGeometry(b.w * MM + 0.0032, b.h * MM + 0.0032, 0.0008), matJunta());
        junta.position.z = -(b.d * MM) * 0.2; // dentro del espesor: solo asoma el borde, no tapa la cara interior
        m.add(junta);
      }
      return m;
    };

    const padres = new Map<number, THREE.Group>();
    modelo.bloques.forEach((b, i) => {
      if (!b.movil) return;
      const g = new THREE.Group();
      if (b.movil.clase === "puerta") {
        const xb = b.movil.bisagra === "izq" ? b.x : b.x + b.w;
        g.position.set(X(xb), 0, b.z * MM);
        s.moviles.push({ obj: g, clase: "puerta", signo: b.movil.bisagra === "izq" ? -1 : 1, orden: i, recorrido: 0 });
      } else {
        g.position.set(0, 0, 0);
        s.moviles.push({ obj: g, clase: "cajon", signo: 1, orden: i, recorrido: (modelo.fondo * 0.62) * MM });
      }
      s.grupo.add(g);
      padres.set(i, g);
    });

    let luces = 0;
    modelo.bloques.forEach((b, i) => {
      const m = malla(b);
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2, cz = b.z + b.d / 2;
      const g = padres.get(b.movil ? i : (b.padre ?? -1));
      if (g) {
        const esPuerta = s.moviles.find((x) => x.obj === g)?.clase === "puerta";
        if (esPuerta) m.position.set(X(cx) - g.position.x, cy * MM, cz * MM - g.position.z);
        else m.position.set(X(cx), cy * MM, cz * MM);
        g.add(m);
      } else {
        m.position.set(X(cx), cy * MM, cz * MM);
        s.grupo.add(m);
      }
      // cinta LED: una luz cálida suave bajo cada perfil ilumina el nivel de abajo
      if (b.tipo === "luz" && luces < 8) {
        luces++;
        const l = new THREE.PointLight("#ffd29a", 1.6, Math.max(0.6, (b.w * MM) * 0.9), 2);
        l.position.set(0, -0.06, -0.04);
        m.add(l);
      }
    });

    // decoración y altura de montaje
    const elev = elevacion(mueble);
    s.grupo.position.y = elev;
    let yMin = 0, yMax = elev + H * MM;
    if (decorar) {
      const deco = crearDecoracion(mueble, modelo);
      s.decoracion.add(deco.grupo);
      yMin = deco.yMin;
      yMax = Math.max(yMax, deco.yMax);
    } else if (elev) yMin = elev - 0.25;
    const alto = yMax - yMin;

    // luz y cámara según tamaño
    const tam = Math.max(A * MM, alto, F * MM);
    s.luz.position.set(-tam * 1.2, yMin + tam * 2.2 + 1, tam * 2 + 1.2);
    s.luz.target.position.set(0, yMin + alto / 2, 0);
    const sc = s.luz.shadow.camera;
    sc.left = sc.bottom = -tam * 1.5;
    sc.right = sc.top = tam * 1.5;
    sc.near = 0.1;
    sc.far = tam * 8 + 8;
    sc.updateProjectionMatrix();

    const objetivo = new THREE.Vector3(0, yMin + alto / 2, (F * MM) / 2);
    s.controls.target.copy(objetivo);
    if (!s.ultimoTamano || Math.abs(tam - s.ultimoTamano) / s.ultimoTamano > 0.25) {
      const dist = Math.max(A * MM * 1.15, alto * 1.25) / (2 * Math.tan(THREE.MathUtils.degToRad(s.camera.fov / 2))) + F * MM;
      const dir = new THREE.Vector3(0.45, 0.28, 1).normalize();
      s.camera.position.copy(objetivo).addScaledVector(dir, dist * 1.08);
      s.controls.minDistance = dist * 0.35;
      s.controls.maxDistance = dist * 2.5;
      s.ultimoTamano = tam;
    }
    s.pedir();
  }, [modelo, acabados, mueble, decorar]);

  useEffect(() => {
    if (escena.current) {
      escena.current.abierto = abierto;
      escena.current.pedir();
    }
  }, [abierto]);

  // Ambiente (estudio, habitación o sala)
  useEffect(() => {
    const s = escena.current;
    if (!s) return;
    s.ambiente.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
    });
    s.ambiente.clear();
    const { grupo, fondo } = crearEscenario(escenario, modelo.ancho * MM, modelo.alto * MM);
    s.ambiente.add(grupo);
    s.scene.background = new THREE.Color(fondo);
    s.pedir();
  }, [escenario, modelo.ancho, modelo.alto]);

  return (
    <div ref={contenedor} className="vista3d">
      {sinWebgl && <p className="nota">Este dispositivo no puede mostrar la vista 3D.</p>}
    </div>
  );
}
