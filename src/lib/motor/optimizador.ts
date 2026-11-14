// Optimización de cortes en lámina: MaxRects (Best Short Side Fit) con grosor de sierra y refilado.

export interface PiezaACortar {
  ref: string; // referencia (código de pieza en la lista de cortes)
  nombre: string;
  largo: number; // sentido de la veta
  ancho: number;
}

export interface Colocacion extends PiezaACortar {
  x: number; // posición en la lámina (mm) sobre el largo
  y: number; // posición sobre el ancho
  rotada: boolean;
  // dimensiones ocupadas en la lámina (sin sierra)
  w: number;
  h: number;
}

export interface Lamina {
  numero: number;
  largo: number;
  ancho: number;
  piezas: Colocacion[];
  areaUsada: number; // mm²
  aprovechamiento: number; // 0..1
}

export interface OpcionesOptimizacion {
  largoLamina: number;
  anchoLamina: number;
  sierra: number;
  refilado: number;
  permitirRotar: boolean;
}

interface Libre {
  x: number;
  y: number;
  w: number;
  h: number;
}

class Bin {
  libres: Libre[];
  colocadas: Colocacion[] = [];
  constructor(public W: number, public H: number) {
    this.libres = [{ x: 0, y: 0, w: W, h: H }];
  }

  buscar(w: number, h: number, rotar: boolean) {
    let mejor: { x: number; y: number; rot: boolean; s: number; l: number } | null = null;
    for (const r of this.libres) {
      const intentos: [number, number, boolean][] = [[w, h, false]];
      if (rotar && w !== h) intentos.push([h, w, true]);
      for (const [pw, ph, rot] of intentos) {
        if (pw <= r.w && ph <= r.h) {
          const s = Math.min(r.w - pw, r.h - ph);
          const l = Math.max(r.w - pw, r.h - ph);
          if (!mejor || s < mejor.s || (s === mejor.s && l < mejor.l)) mejor = { x: r.x, y: r.y, rot, s, l };
        }
      }
    }
    return mejor;
  }

  colocar(x: number, y: number, w: number, h: number) {
    const nuevos: Libre[] = [];
    for (const r of this.libres) {
      if (x >= r.x + r.w || x + w <= r.x || y >= r.y + r.h || y + h <= r.y) {
        nuevos.push(r);
        continue;
      }
      if (x > r.x) nuevos.push({ x: r.x, y: r.y, w: x - r.x, h: r.h });
      if (x + w < r.x + r.w) nuevos.push({ x: x + w, y: r.y, w: r.x + r.w - (x + w), h: r.h });
      if (y > r.y) nuevos.push({ x: r.x, y: r.y, w: r.w, h: y - r.y });
      if (y + h < r.y + r.h) nuevos.push({ x: r.x, y: y + h, w: r.w, h: r.y + r.h - (y + h) });
    }
    // quitar duplicados y rectángulos contenidos en otros
    const unicos = nuevos.filter((a, i) => nuevos.findIndex((b) => b.x === a.x && b.y === a.y && b.w === a.w && b.h === a.h) === i);
    this.libres = unicos.filter(
      (a, i) => !unicos.some((b, j) => i !== j && a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h),
    );
  }
}

export function optimizar(piezas: PiezaACortar[], o: OpcionesOptimizacion): { laminas: Lamina[]; noCaben: PiezaACortar[] } {
  const W = o.largoLamina - 2 * o.refilado + o.sierra;
  const H = o.anchoLamina - 2 * o.refilado + o.sierra;
  const orden = [...piezas].sort((a, b) => Math.max(b.largo, b.ancho) - Math.max(a.largo, a.ancho) || b.largo * b.ancho - a.largo * a.ancho);
  const bins: Bin[] = [];
  const noCaben: PiezaACortar[] = [];

  for (const p of orden) {
    const w = p.largo + o.sierra;
    const h = p.ancho + o.sierra;
    let puesto = false;
    for (const b of bins) {
      const pos = b.buscar(w, h, o.permitirRotar);
      if (pos) {
        agregar(b, p, pos.x, pos.y, pos.rot, w, h);
        puesto = true;
        break;
      }
    }
    if (!puesto) {
      const b = new Bin(W, H);
      const pos = b.buscar(w, h, o.permitirRotar);
      if (!pos) {
        noCaben.push(p);
        continue;
      }
      bins.push(b);
      agregar(b, p, pos.x, pos.y, pos.rot, w, h);
    }
  }

  const areaLamina = o.largoLamina * o.anchoLamina;
  const laminas = bins.map((b, i) => {
    const area = b.colocadas.reduce((s, c) => s + c.w * c.h, 0);
    return { numero: i + 1, largo: o.largoLamina, ancho: o.anchoLamina, piezas: b.colocadas, areaUsada: area, aprovechamiento: area / areaLamina };
  });
  return { laminas, noCaben };

  function agregar(b: Bin, p: PiezaACortar, x: number, y: number, rot: boolean, w: number, h: number) {
    const ww = rot ? h : w;
    const hh = rot ? w : h;
    b.colocar(x, y, ww, hh);
    b.colocadas.push({ ...p, x: x + o.refilado, y: y + o.refilado, rotada: rot, w: ww - o.sierra, h: hh - o.sierra });
  }
}
