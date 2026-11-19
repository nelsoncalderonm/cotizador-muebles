// Partes que no se ven: van en melamina blanca (más económica) cuando el mueble es de color o madera.
// Una pieza no se ve si es interna siempre (cajones por dentro, travesaños) o si las puertas y frentes de
// cajón la tapan por completo en la vista frontal (entrepaños, divisiones y pisos detrás de puertas).

import type { Pieza, RectVista, ResultadoMueble } from "./tipos";
import { ACABADOS_DEFECTO, acabado, type AcabadosItem } from "../acabados";

const SIEMPRE = /(_costado|_contra)$|^travesano$/;
const NUNCA = /^(lateral|techo|cubierta|faldon|lateral_cajonera)$|^zocalo/;
/** Muebles en los que el piso se ve desde abajo o desde arriba. */
const PISO_A_LA_VISTA = new Set(["aereo_cocina", "repisa_flotante", "mesa_centro"]);

/** ¿El carpintero quiere el interior en blanco? Por defecto sí, salvo que el cuerpo ya sea blanco. */
export function usaInteriorBlanco(a: AcabadosItem | undefined) {
  const ac = a ?? ACABADOS_DEFECTO;
  if (ac.cuerpo === "blanco" || acabado(ac.cuerpo).base.toLowerCase() === "#f1efea") return false;
  return ac.interiorBlanco !== false;
}

function tapado(r: RectVista, frentes: RectVista[]) {
  const tol = 8; // holgura entre frentes y canto visible
  const pasos = 4;
  for (let i = 0; i <= pasos; i++)
    for (let j = 0; j <= pasos; j++) {
      const x = r.x + 1 + ((r.w - 2) * i) / pasos;
      const y = r.y + 1 + ((r.h - 2) * j) / pasos;
      if (!frentes.some((f) => x >= f.x - tol && x <= f.x + f.w + tol && y >= f.y - tol && y <= f.y + f.h + tol)) return false;
    }
  return true;
}

/** Ids de las piezas de cuerpo que no quedan a la vista. */
export function piezasOcultas(res: ResultadoMueble, muebleId: string): Set<string> {
  const frentes = res.vista.rects.filter((r) => r.tipo === "frente" && r.piezaId !== "cubierta");
  const out = new Set<string>();
  for (const p of res.piezas) {
    if (p.material !== "cuerpo") continue;
    if (SIEMPRE.test(p.id)) {
      out.add(p.id);
      continue;
    }
    if (NUNCA.test(p.id) || (p.id === "piso" && PISO_A_LA_VISTA.has(muebleId)) || !frentes.length) continue;
    const propios = res.vista.rects.filter((r) => r.piezaId === p.id && r.tipo !== "detalle");
    if (propios.length && propios.every((r) => tapado(r, frentes))) out.add(p.id);
  }
  return out;
}

/** Piezas que van en melamina blanca para este mueble (vacío si no aplica). */
export function piezasInterior(res: ResultadoMueble, muebleId: string, acabados: AcabadosItem | undefined): Set<string> {
  return usaInteriorBlanco(acabados) ? piezasOcultas(res, muebleId) : new Set();
}

export const esInterior = (p: Pieza, interior: Set<string>) => p.material === "cuerpo" && interior.has(p.id);
