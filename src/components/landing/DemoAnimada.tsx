"use client";

import { useEffect, useMemo, useState } from "react";
import { buscarMueble, valoresPorDefecto } from "@/lib/motor/catalogo";
import { CONFIG_DEFECTO, PRECIOS_DEFECTO } from "@/lib/motor/defaults";
import { calcularProyecto } from "@/lib/motor/proyecto";
import { formatoDinero } from "@/lib/estado";
import { VistaMueble } from "../VistaMueble";
import { LaminaSvg } from "../LaminaSvg";

const MEDIDAS = [
  { ancho: 600, alto: 720 },
  { ancho: 800, alto: 720 },
  { ancho: 1000, alto: 720 },
];

/** Teléfono que muestra el mueble armándose y el precio cambiando con las medidas: todo calculado en vivo. */
export function DemoTelefono() {
  const def = buscarMueble("bajo_cocina")!;
  const [i, setI] = useState(0);
  const [paso, setPaso] = useState(0);
  const m = MEDIDAS[i % MEDIDAS.length];
  const valores = useMemo(() => ({ ...valoresPorDefecto(def), ...m, frente: "mixto" }), [def, m]);
  const r = useMemo(
    () => calcularProyecto([{ uid: "d", muebleId: def.id, nombre: def.nombre, valores, cantidad: 1 }], CONFIG_DEFECTO, PRECIOS_DEFECTO),
    [def, valores],
  );
  const res = r.muebles[0].resultado;
  const pasos = res.pasos;

  useEffect(() => {
    const t = setInterval(() => {
      setPaso((p) => {
        if (p + 1 >= pasos.length + 2) {
          setI((x) => x + 1);
          return 0;
        }
        return p + 1;
      });
    }, 1100);
    return () => clearInterval(t);
  }, [pasos.length]);

  const p = Math.min(paso, pasos.length - 1);
  const conocidas = new Set(pasos.flatMap((x) => x.piezas));
  const visibles = new Set(pasos.slice(0, p + 1).flatMap((x) => x.piezas));
  const resaltar = paso < pasos.length ? new Set(pasos[p].piezas) : new Set<string>();
  const frentes = pasos.slice(0, p + 1).some((x) => x.piezas.some((id) => id === "puerta" || id.endsWith("_frente")));

  return (
    <div className="ld-telefono" aria-hidden>
      <div className="ld-tel-pantalla">
        <div className="ld-tel-barra">
          <span>Cocina · módulo 1</span>
          <b>{m.ancho} mm</b>
        </div>
        <div className="ld-tel-vista">
          <VistaMueble vista={res.vista} visibles={visibles} conocidas={conocidas} resaltar={resaltar} frentes={frentes} />
        </div>
        <div className="ld-tel-paso">{paso < pasos.length ? `${p + 1}. ${pasos[p].titulo}` : "Listo para cortar"}</div>
        <div className="ld-tel-total">
          <span>
            {r.cortes.reduce((s, c) => s + c.cantidad, 0)} piezas · {r.materiales.reduce((s, x) => s + x.laminas.length, 0)} láminas
          </span>
          <strong>{formatoDinero(r.total, PRECIOS_DEFECTO)}</strong>
        </div>
      </div>
    </div>
  );
}

/** Lámina optimizada real de una cocina de ejemplo. */
export function DemoLamina() {
  const r = useMemo(() => {
    const items = [
      { id: "bajo_cocina", n: 3 },
      { id: "aereo_cocina", n: 2 },
    ].map((x, k) => {
      const d = buscarMueble(x.id)!;
      return { uid: String(k), muebleId: d.id, nombre: d.nombre, valores: valoresPorDefecto(d), cantidad: x.n };
    });
    return calcularProyecto(items, CONFIG_DEFECTO, PRECIOS_DEFECTO);
  }, []);
  const l = r.materiales[0].laminas[0];
  return (
    <figure className="ld-lamina">
      <LaminaSvg lamina={l} />
      <figcaption>
        Lámina real optimizada · <b>{Math.round(l.aprovechamiento * 100)} % aprovechada</b>
      </figcaption>
    </figure>
  );
}

/** Closet con cotas, como sale en el plano. */
export function DemoPlano() {
  const d = buscarMueble("closet")!;
  const res = useMemo(() => d.generar(valoresPorDefecto(d), CONFIG_DEFECTO), [d]);
  return (
    <div className="ld-plano">
      <VistaMueble vista={res.vista} />
    </div>
  );
}
