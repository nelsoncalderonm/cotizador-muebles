import { CATALOGO, valoresPorDefecto } from "../src/lib/motor/catalogo";
import { calcularProyecto } from "../src/lib/motor/proyecto";
import { CONFIG_DEFECTO, PRECIOS_DEFECTO } from "../src/lib/motor/defaults";

const items = CATALOGO.map((d, i) => ({ uid: String(i), muebleId: d.id, nombre: d.nombre, valores: valoresPorDefecto(d), cantidad: 1 }));
const r = calcularProyecto(items, CONFIG_DEFECTO, PRECIOS_DEFECTO);
for (const m of r.muebles) console.log(m.nombreMueble, m.resultado.piezas.length, "piezas", m.resultado.pasos.length, "pasos", m.resultado.advertencias);
console.log(r.cortes.slice(0, 8));
for (const m of r.materiales) console.log(m.nombre, m.laminas.length, "láminas", m.laminas.map((l) => (l.aprovechamiento * 100).toFixed(0) + "%").join(" "), "noCaben", m.noCaben.length);
// verificar que no hay solapes
for (const m of r.materiales) for (const l of m.laminas) {
  for (let i = 0; i < l.piezas.length; i++) for (let j = i + 1; j < l.piezas.length; j++) {
    const a = l.piezas[i], b = l.piezas[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) console.log("SOLAPE", m.nombre, l.numero, a.ref, b.ref);
  }
  for (const p of l.piezas) if (p.x + p.w > l.largo - 9 || p.y + p.h > l.ancho - 9) console.log("FUERA", p);
}
console.log("canto m", r.metrosCanto, "total", Math.round(r.total), r.advertencias);
console.log(r.herrajes);
