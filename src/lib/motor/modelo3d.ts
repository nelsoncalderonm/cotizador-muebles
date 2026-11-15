// Modelo 3D del mueble a partir del resultado del motor: cada pieza como un bloque con espesor y profundidad reales.
// Ejes: x a la derecha, y hacia arriba, z hacia el frente (la cara trasera del mueble está en z = 0). Medidas en mm.

import { bisagrasPorPuerta, esPuerta as idPuerta } from "./constructor";
import type { Configuracion, ResultadoMueble } from "./tipos";

export type TipoBloque = "cuerpo" | "frente" | "fondo" | "metal";

export interface Bloque {
  piezaId: string;
  tipo: TipoBloque;
  forma: "caja" | "cilindro_v" | "cilindro_h";
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  /** Puertas: lado de la bisagra para animar la apertura. Cajones: se deslizan. */
  movil?: { clase: "puerta"; bisagra: "izq" | "der" } | { clase: "cajon" };
  /** Jaladera que pertenece a este frente (índice del bloque padre). */
  padre?: number;
}

export interface Modelo3D {
  bloques: Bloque[];
  ancho: number;
  alto: number;
  fondo: number;
}

const JALADERA = { largo: 128, grosor: 12, salida: 28 };

export function modelo3d(res: ResultadoMueble, fondo: number, cfg: Configuracion): Modelo3D {
  const e = cfg.materiales.cuerpo.espesor;
  const eF = cfg.materiales.frente.espesor;
  const eFondo = cfg.materiales.fondo.espesor;
  const F = fondo;
  const tieneFondo = res.vista.rects.some((r) => r.piezaId === "fondo");
  const z0 = tieneFondo ? eFondo : 0;
  const bloques: Bloque[] = [];
  const puertas = res.vista.rects.filter((r) => r.tipo === "frente" && idPuerta(r.piezaId));

  for (const r of res.vista.rects) {
    const caja = (z: number, d: number, tipo: TipoBloque = "cuerpo") => bloques.push({ piezaId: r.piezaId, tipo, forma: "caja", x: r.x, y: r.y, z, w: r.w, h: r.h, d });
    switch (r.piezaId) {
      case "fondo":
        caja(0, eFondo, "fondo");
        break;
      case "pata":
        for (const z of [60, F - 60]) bloques.push({ piezaId: "pata", tipo: "metal", forma: "cilindro_v", x: r.x, y: r.y, z: z - r.w / 2, w: r.w, h: r.h, d: r.w });
        break;
      case "tubo":
        bloques.push({ piezaId: "tubo", tipo: "metal", forma: "cilindro_h", x: r.x, y: r.y, z: F / 2 - 10, w: r.w, h: 20, d: 20 });
        break;
      case "faldon":
        caja(30, e);
        break;
      case "zocalo":
      case "zocalo_cajonera":
        caja(F - e - 40, e);
        break;
      case "travesano":
        caja(F - 100, 100);
        caja(z0, 100);
        break;
      case "entrepano":
      case "maletero":
        caja(z0, F - z0 - 20);
        break;
      case "cubierta":
        caja(0, F, "frente");
        break;
      case "lateral":
        caja(z0, F - z0);
        break;
      case "lateral_cajonera":
      case "piso_cajonera":
        caja(0, F - 20);
        break;
      default:
        if (r.tipo === "frente") {
          const esPuerta = idPuerta(r.piezaId);
          let bisagra: "izq" | "der" = "izq";
          if (esPuerta) {
            // en pares por fila (misma altura): la primera abre a la izquierda y la segunda a la derecha
            const fila = puertas.filter((q) => Math.abs(q.y - r.y) < 20).sort((a, b) => a.x - b.x);
            const i = fila.indexOf(r);
            bisagra = fila.length > 1 && i % 2 === 1 ? "der" : "izq";
          }
          const idx = bloques.length;
          bloques.push({
            piezaId: r.piezaId,
            tipo: "frente",
            forma: "caja",
            x: r.x,
            y: r.y,
            z: F,
            w: r.w,
            h: r.h,
            d: eF,
            movil: esPuerta ? { clase: "puerta", bisagra } : { clase: "cajon" },
          });
          if (esPuerta) {
            const largo = Math.min(JALADERA.largo * 1.5, r.h * 0.4);
            const x = bisagra === "izq" ? r.x + r.w - 45 : r.x + 45 - JALADERA.grosor;
            // puertas altas (sobre ~90 cm): tirador abajo; puertas largas: a la altura de la mano; resto: arriba
            const yCentro =
              r.y > 900 ? r.y + 70 + largo / 2 : r.y + r.h > 1400 ? r.y + Math.min(r.h / 2, 1050 - r.y) : r.y + r.h - 70 - largo / 2;
            bloques.push({ piezaId: "jaladera", tipo: "metal", forma: "caja", x, y: yCentro - largo / 2, z: F + eF, w: JALADERA.grosor, h: largo, d: JALADERA.salida, padre: idx });
            // bisagras de cazoleta: brazo en la puerta y base en el lateral (se ven al abrir)
            const nb = bisagrasPorPuerta(r.h);
            for (let k = 0; k < nb; k++) {
              const yb = r.y + 90 + ((r.h - 180) * k) / (nb - 1) - 22;
              const xb = bisagra === "izq" ? r.x + 6 : r.x + r.w - 6 - 52;
              bloques.push({ piezaId: "bisagra", tipo: "metal", forma: "caja", x: xb, y: yb, z: F - 14, w: 52, h: 44, d: 14, padre: idx });
              const xl = bisagra === "izq" ? r.x + e - 2 : r.x + r.w - e + 2 - 3;
              bloques.push({ piezaId: "bisagra", tipo: "metal", forma: "caja", x: xl, y: yb + 4, z: F - 62, w: 3, h: 36, d: 46 });
            }
          } else {
            const largo = Math.min(JALADERA.largo * 1.5, r.w * 0.5);
            bloques.push({ piezaId: "jaladera", tipo: "metal", forma: "caja", x: r.x + r.w / 2 - largo / 2, y: r.y + r.h - Math.min(45, r.h / 3), z: F + eF, w: largo, h: JALADERA.grosor, d: JALADERA.salida, padre: idx });
            // caja interior del cajón (se ve al abrir)
            const xi = r.x + e + 15, wi = r.w - 2 * e - 30, yi = r.y + 25, hi = Math.max(60, Math.min(r.h - 60, 220)), zi = 40, di = F - 60;
            const parte = (x: number, y: number, z: number, w: number, h: number, d: number) =>
              bloques.push({ piezaId: "cajon_caja", tipo: "cuerpo", forma: "caja", x, y, z, w, h, d, padre: idx });
            parte(xi, yi, zi, e, hi, di);
            parte(xi + wi - e, yi, zi, e, hi, di);
            parte(xi + e, yi, zi, wi - 2 * e, hi, e);
            parte(xi + e, yi, zi + di - e, wi - 2 * e, hi, e);
            parte(xi, yi - eFondo, zi, wi, eFondo, di);
            // correderas telescópicas a los lados de la caja
            for (const xc of [xi - 12.5, xi + wi])
              bloques.push({ piezaId: "corredera", tipo: "metal", forma: "caja", x: xc, y: yi + hi / 2 - 22, z: zi + 10, w: 12.5, h: 44, d: di - 20, padre: idx });
          }
        } else if (r.piezaId.startsWith("entrepano") && r.piezaId !== "entrepano_fijo") {
          caja(z0, F - z0 - 20);
        } else if (r.tipo === "estructura") {
          caja(z0, F - z0);
        }
    }
  }
  return { bloques, ancho: res.vista.ancho, alto: res.vista.alto, fondo: F + eF + JALADERA.salida };
}
