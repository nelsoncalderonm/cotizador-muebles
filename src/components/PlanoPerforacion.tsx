"use client";
// Dibujo de una pieza con sus perforaciones y las distancias a los bordes, para el operario.

import { HERRAMIENTAS, type PlanoPieza, type TipoPerf } from "@/lib/motor/perforaciones";

const r = (n: number) => Math.round(n);

export function PlanoPerforacion({ plano }: { plano: PlanoPieza }) {
  const { ancho: W, alto: H } = plano;
  const vertical = plano.ejeY === "desde abajo";
  const desdeFrente = plano.ejeY.startsWith("desde el borde frontal");
  // escala: el lado mayor del dibujo ocupa ~1000 unidades
  const k = 1000 / Math.max(W, H);
  const w = W * k, h = H * k;
  const m = { izq: 210, der: 40, arr: 40, aba: 140 };
  const X = (x: number) => m.izq + x * k;
  const Y = (y: number) => m.arr + h - y * k; // y crece hacia arriba
  const xs = [...new Set(plano.perforaciones.map((p) => r(p.x)))].sort((a, b) => a - b);
  const ys = [...new Set(plano.perforaciones.map((p) => r(p.y)))].sort((a, b) => a - b);
  const fs = 30;
  // cotas en dos filas (o columnas) para que las cercanas no se pisen
  const enFilas = (lista: number[], min: number) => {
    const ult = [-1e9, -1e9];
    return lista.map((v) => {
      const fila = v * k - ult[0] >= min ? 0 : v * k - ult[1] >= min ? 1 : 0;
      ult[fila] = v * k;
      return { v, fila };
    });
  };
  const tipos = [...new Set(plano.perforaciones.map((p) => p.tipo))] as TipoPerf[];

  return (
    <figure className="plano-perf">
      <svg viewBox={`0 0 ${w + m.izq + m.der} ${h + m.arr + m.aba}`} role="img" aria-label={`Perforaciones de ${plano.titulo}`}>
        <rect x={X(0)} y={Y(H)} width={w} height={h} className="pp-pieza" />
        {/* borde de referencia */}
        {vertical && <line x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(H)} className="pp-frente" />}
        {desdeFrente && <line x1={X(0)} y1={Y(0)} x2={X(W)} y2={Y(0)} className="pp-frente" />}
        {/* guías punteadas hasta las cotas */}
        {plano.perforaciones.map((p, i) => (
          <g key={`g${i}`} className="pp-guia">
            <line x1={X(p.x)} y1={Y(p.y)} x2={X(p.x)} y2={Y(0) + 20} />
            <line x1={X(p.x)} y1={Y(p.y)} x2={X(0) - 20} y2={Y(p.y)} />
          </g>
        ))}
        {plano.perforaciones.map((p, i) => {
          const t = HERRAMIENTAS[p.tipo];
          const rad = Math.max((t.diametro / 2) * k, 9);
          if (p.tipo === "tarugo_canto") {
            // agujero en el canto: se marca entrando en la pieza
            const largo = 25 * k + 10;
            const dx = p.canto === "izq" ? 1 : p.canto === "der" ? -1 : 0;
            const dy = p.canto === "abajo" ? -1 : p.canto === "arriba" ? 1 : 0;
            return (
              <line key={i} x1={X(p.x)} y1={Y(p.y)} x2={X(p.x) + dx * largo} y2={Y(p.y) - dy * largo} stroke={t.color} strokeWidth={Math.max(8 * k, 9)} strokeLinecap="round" />
            );
          }
          return <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={rad} fill={p.tipo === "cazoleta" ? "none" : t.color} stroke={t.color} strokeWidth={p.tipo === "cazoleta" ? 6 : 0} />;
        })}
        {/* cotas horizontales (abajo) y verticales (izquierda) */}
        {enFilas(xs, fs * 1.9).map(({ v: x, fila }) => (
          <text key={`x${x}`} x={X(x)} y={Y(0) + 50 + fila * 34} className="pp-cota" textAnchor="middle" fontSize={fs}>
            {x}
          </text>
        ))}
        {enFilas(ys, fs * 1.05).map(({ v: y, fila }) => (
          <text key={`y${y}`} x={X(0) - 26 - fila * 70} y={Y(y) + fs * 0.35} className="pp-cota" textAnchor="end" fontSize={fs}>
            {y}
          </text>
        ))}
        <text x={X(W / 2)} y={Y(0) + 118} className="pp-eje" textAnchor="middle" fontSize={fs * 0.9}>
          {vertical ? "← FRENTE" : desdeFrente ? "FRENTE (canto)" : ""} · {r(W)} mm
        </text>
        <text x={X(W) + 8} y={Y(H) - 10} className="pp-eje" textAnchor="end" fontSize={fs * 0.9}>
          {r(H)} mm
        </text>
      </svg>
      <figcaption>
        <ul className="pp-leyenda">
          {tipos.map((t) => {
            const hh = HERRAMIENTAS[t];
            const n = plano.perforaciones.filter((p) => p.tipo === t).length;
            return (
              <li key={t}>
                <i style={{ background: hh.color }} aria-hidden />
                <span>
                  <b>
                    {n} × {hh.nombre}
                  </b>
                  <small>
                    {hh.herramienta} · profundidad {hh.profundidad}
                  </small>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="pp-ejes">
          Medidas en mm: horizontal {plano.ejeX}; vertical {plano.ejeY}.
        </p>
        {plano.notas.map((n) => (
          <p key={n} className="pp-nota">
            {n}
          </p>
        ))}
      </figcaption>
    </figure>
  );
}
