"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { acabado, jaladera, type Acabado, type AcabadosItem } from "@/lib/acabados";
import type { Bloque, Modelo3D } from "@/lib/motor/modelo3d";

const MM = 0.001;

/** Textura procedural (sin imágenes): veta de madera o melamina lisa con grano fino. */
function texturaAcabado(a: Acabado) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 1024;
  const g = c.getContext("2d")!;
  g.fillStyle = a.base;
  g.fillRect(0, 0, c.width, c.height);
  let semilla = 7;
  const azar = () => {
    semilla = (semilla * 16807) % 2147483647;
    return semilla / 2147483647;
  };
  if (a.veta) {
    // vetas largas onduladas
    for (let i = 0; i < 260; i++) {
      const x0 = azar() * c.width;
      const ancho = 0.4 + azar() * 2.2;
      const amp = 1 + azar() * 4;
      const frec = 0.001 + azar() * 0.004;
      const fase = azar() * 10;
      g.strokeStyle = a.veta;
      g.globalAlpha = 0.08 + azar() * 0.28;
      g.lineWidth = ancho;
      g.beginPath();
      for (let y = 0; y <= c.height; y += 8) {
        const x = x0 + Math.sin(y * frec + fase) * amp + Math.sin(y * frec * 3.1 + fase) * amp * 0.25;
        if (y === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    // nudos suaves
    for (let i = 0; i < 3; i++) {
      const x = azar() * c.width, y = azar() * c.height;
      for (let k = 6; k > 0; k--) {
        g.globalAlpha = 0.05;
        g.fillStyle = a.veta;
        g.beginPath();
        g.ellipse(x, y, k * 5, k * 14, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  // grano fino
  const img = g.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (azar() - 0.5) * (a.veta ? 14 : 7);
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.globalAlpha = 1;
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Ajusta las coordenadas UV para que la veta tenga escala real y siga el lado largo de la pieza. */
function cajaConUV(w: number, h: number, d: number) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const escala = 0.6; // metros por repetición de textura
  const vetaHorizontal = w > h;
  // orden de caras de BoxGeometry: +x, -x, +y, -y, +z, -z (4 vértices cada una)
  const caras: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    const [fu, fv] = caras[f];
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      const u = uv.getX(i) * (fu / escala);
      const v = uv.getY(i) * (fv / escala);
      if (vetaHorizontal) uv.setXY(i, v, u);
      else uv.setXY(i, u, v);
    }
  }
  uv.needsUpdate = true;
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
  ultimoTamano: number;
  texturas: THREE.Texture[];
}

interface Props {
  modelo: Modelo3D;
  acabados: AcabadosItem;
  abierto: boolean;
  onListo?: (capturar: () => Blob | null) => void;
}

export function Vista3D({ modelo, acabados, abierto, onListo }: Props) {
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e8e4de");
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;

    // habitación: piso y pared
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: "#cfc6b8", roughness: 0.85 }));
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    scene.add(piso);
    const pared = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), new THREE.MeshStandardMaterial({ color: "#efebe5", roughness: 0.95 }));
    pared.position.set(0, 5, -0.004);
    pared.receiveShadow = true;
    scene.add(pared);
    const rodapie = new THREE.Mesh(new THREE.BoxGeometry(20, 0.07, 0.012), new THREE.MeshStandardMaterial({ color: "#f6f4f0", roughness: 0.6 }));
    rodapie.position.set(0, 0.035, 0.002);
    rodapie.receiveShadow = true;
    scene.add(rodapie);

    scene.add(new THREE.HemisphereLight("#ffffff", "#b8a890", 0.55));
    const luz = new THREE.DirectionalLight("#fff6ea", 2.1);
    luz.castShadow = true;
    luz.shadow.mapSize.set(2048, 2048);
    luz.shadow.bias = -0.0004;
    luz.shadow.normalBias = 0.02;
    luz.shadow.radius = 4;
    scene.add(luz);
    scene.add(luz.target);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 60);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minAzimuthAngle = -Math.PI / 2.3;
    controls.maxAzimuthAngle = Math.PI / 2.3;

    const grupo = new THREE.Group();
    scene.add(grupo);

    const s: Escena = { renderer, scene, camera, controls, grupo, luz, moviles: [], abierto: false, ultimoTamano: 0, texturas: [] };
    escena.current = s;

    const ajustar = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    ajustar();

    let raf = 0;
    const reloj = new THREE.Clock();
    const bucle = () => {
      raf = requestAnimationFrame(bucle);
      const dt = Math.min(reloj.getDelta(), 0.05);
      for (const m of s.moviles) {
        if (m.clase === "puerta") {
          const objetivo = s.abierto ? m.signo * THREE.MathUtils.degToRad(105) : 0;
          m.obj.rotation.y += (objetivo - m.obj.rotation.y) * Math.min(1, dt * 5);
        } else {
          const objetivo = s.abierto ? m.recorrido : 0;
          m.obj.position.z += (objetivo - m.obj.position.z) * Math.min(1, dt * 5);
        }
      }
      controls.update();
      renderer.render(scene, camera);
    };
    bucle();

    onListo?.(() => {
      renderer.render(scene, camera);
      const url = renderer.domElement.toDataURL("image/png");
      const bin = atob(url.split(",")[1]);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: "image/png" });
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
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
    s.texturas.forEach((t) => t.dispose());
    s.texturas = [];
    s.moviles = [];

    const aCuerpo = acabado(acabados.cuerpo);
    const aFrente = acabado(acabados.frente);
    const met = jaladera(acabados.jaladera);
    const tCuerpo = texturaAcabado(aCuerpo);
    const tFrente = aFrente.id === aCuerpo.id ? tCuerpo : texturaAcabado(aFrente);
    s.texturas.push(tCuerpo);
    if (tFrente !== tCuerpo) s.texturas.push(tFrente);
    const matCuerpo = () => new THREE.MeshStandardMaterial({ map: tCuerpo, roughness: aCuerpo.rugosidad, metalness: 0 });
    const matFrente = () => new THREE.MeshStandardMaterial({ map: tFrente, roughness: aFrente.rugosidad, metalness: 0 });
    const matFondo = () => new THREE.MeshStandardMaterial({ map: tCuerpo, roughness: 0.8, color: "#d9d4cc" });
    const matMetal = () => new THREE.MeshStandardMaterial({ color: met.color, metalness: met.metal, roughness: met.rugosidad });
    const matPata = () => new THREE.MeshStandardMaterial({ color: "#2a2a2c", roughness: 0.5, metalness: 0.2 });

    const { ancho: A, alto: H, fondo: F } = modelo;
    const X = (x: number) => (x - A / 2) * MM;

    const malla = (b: Bloque) => {
      let geo: THREE.BufferGeometry;
      if (b.forma === "cilindro_v") geo = new THREE.CylinderGeometry((b.w / 2) * MM, (b.w / 2) * MM * 1.1, b.h * MM, 24);
      else if (b.forma === "cilindro_h") {
        geo = new THREE.CylinderGeometry((b.h / 2) * MM, (b.h / 2) * MM, b.w * MM, 20);
        geo.rotateZ(Math.PI / 2);
      } else geo = cajaConUV(b.w * MM, b.h * MM, b.d * MM);
      const mat =
        b.tipo === "frente" ? matFrente() : b.tipo === "fondo" ? matFondo() : b.tipo === "metal" ? (b.piezaId === "pata" ? matPata() : matMetal()) : matCuerpo();
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = b.tipo !== "fondo";
      m.receiveShadow = true;
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
    });

    // luz y cámara según tamaño
    const tam = Math.max(A, H, F) * MM;
    s.luz.position.set(-tam * 1.2, tam * 2.2 + 1, tam * 2 + 1.2);
    s.luz.target.position.set(0, (H * MM) / 2, 0);
    const sc = s.luz.shadow.camera;
    sc.left = sc.bottom = -tam * 1.5;
    sc.right = sc.top = tam * 1.5;
    sc.near = 0.1;
    sc.far = tam * 8 + 6;
    sc.updateProjectionMatrix();

    const objetivo = new THREE.Vector3(0, (H * MM) / 2, (F * MM) / 2);
    s.controls.target.copy(objetivo);
    if (!s.ultimoTamano || Math.abs(tam - s.ultimoTamano) / s.ultimoTamano > 0.25) {
      const dist = (Math.max(A * 1.15, H * 1.25) * MM) / (2 * Math.tan(THREE.MathUtils.degToRad(s.camera.fov / 2))) + F * MM;
      const dir = new THREE.Vector3(0.45, 0.28, 1).normalize();
      s.camera.position.copy(objetivo).addScaledVector(dir, dist * 1.08);
      s.controls.minDistance = dist * 0.35;
      s.controls.maxDistance = dist * 2.5;
      s.ultimoTamano = tam;
    }
  }, [modelo, acabados]);

  useEffect(() => {
    if (escena.current) escena.current.abierto = abierto;
  }, [abierto]);

  return (
    <div ref={contenedor} className="vista3d">
      {sinWebgl && <p className="nota">Este dispositivo no puede mostrar la vista 3D.</p>}
    </div>
  );
}
