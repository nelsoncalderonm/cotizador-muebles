import type { ResultadoMueble } from "@/lib/motor/tipos";

interface Props {
  vista: ResultadoMueble["vista"];
  cotas?: boolean;
  frentes?: boolean;
  /** Si se pasa, solo se dibujan estas piezas (más las que no pertenecen a ningún paso). */
  visibles?: Set<string> | null;
  resaltar?: Set<string>;
  conocidas?: Set<string>; // piezas que aparecen en algún paso
  titulo?: string;
  className?: string;
}

/** Vista frontal del mueble dibujada 100 % con código (SVG). */
export function VistaMueble({ vista, cotas = true, frentes = true, visibles = null, resaltar, conocidas, titulo, className }: Props) {
  const { ancho: A, alto: H } = vista;
  const base = Math.max(A, H);
  const fs = Math.max(base / 24, 28);
  const maxDesp = Math.max(0, ...vista.cotas.map((c) => c.desplazamiento));
  const pad = cotas ? maxDesp + fs * 2.6 : base * 0.04;
  const Y = (y: number, h = 0) => H - y - h;

  const mostrar = (id: string) => {
    if (!visibles) return true;
    if (conocidas && !conocidas.has(id)) return true;
    return visibles.has(id);
  };

  const rects = vista.rects.filter((r) => (frentes || r.tipo !== "frente") && mostrar(r.piezaId));
  const orden = { detalle: 0, estructura: 1, frente: 2 } as const;
  rects.sort((a, b) => orden[a.tipo] - orden[b.tipo]);

  return (
    <svg
      className={className}
      viewBox={`${-pad} ${-pad} ${A + pad * 2} ${H + pad * 2}`}
      role="img"
      aria-label={titulo ?? "Vista frontal del mueble"}
      style={{ width: "100%", height: "100%" }}
    >
      {rects.map((r, i) => {
        const hl = resaltar?.has(r.piezaId);
        const cls = `pz pz-${r.tipo}${hl ? " pz-resaltada" : ""}`;
        return (
          <g key={i}>
            <rect className={cls} x={r.x} y={Y(r.y, r.h)} width={r.w} height={r.h} vectorEffect="non-scaling-stroke" />
            {r.tipo === "frente" && r.etiqueta && r.w > fs * 2 && r.h > fs * 1.2 && (
              <text className="pz-etq" x={r.x + r.w / 2} y={Y(r.y, r.h) + r.h / 2} fontSize={fs * 0.8} textAnchor="middle" dominantBaseline="central">
                {r.etiqueta}
              </text>
            )}
          </g>
        );
      })}
      {cotas &&
        vista.cotas.map((c, i) => {
          const dx = c.x2 - c.x1, dy = c.y2 - c.y1;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;
          const d = c.desplazamiento + fs * 0.6;
          const p1 = { x: c.x1 + nx * d, y: Y(c.y1 + ny * d) };
          const p2 = { x: c.x2 + nx * d, y: Y(c.y2 + ny * d) };
          const mx = (p1.x + p2.x) / 2 + nx * fs * 0.7;
          const my = (p1.y + p2.y) / 2 - ny * fs * 0.7;
          const vertical = Math.abs(dx) < Math.abs(dy);
          const t = fs * 0.35;
          return (
            <g key={`c${i}`} className="cota">
              <line x1={c.x1 + nx * fs * 0.2} y1={Y(c.y1 + ny * fs * 0.2)} x2={p1.x + nx * t} y2={p1.y - ny * t} vectorEffect="non-scaling-stroke" />
              <line x1={c.x2 + nx * fs * 0.2} y1={Y(c.y2 + ny * fs * 0.2)} x2={p2.x + nx * t} y2={p2.y - ny * t} vectorEffect="non-scaling-stroke" />
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} vectorEffect="non-scaling-stroke" />
              <line className="tope" x1={p1.x - t * (vertical ? 1 : 0.7)} y1={p1.y + t * (vertical ? 0.7 : 1)} x2={p1.x + t * (vertical ? 1 : 0.7)} y2={p1.y - t * (vertical ? 0.7 : 1)} vectorEffect="non-scaling-stroke" />
              <line className="tope" x1={p2.x - t * (vertical ? 1 : 0.7)} y1={p2.y + t * (vertical ? 0.7 : 1)} x2={p2.x + t * (vertical ? 1 : 0.7)} y2={p2.y - t * (vertical ? 0.7 : 1)} vectorEffect="non-scaling-stroke" />
              <text
                x={mx}
                y={my}
                fontSize={fs}
                textAnchor="middle"
                dominantBaseline="central"
                transform={vertical ? `rotate(-90 ${mx} ${my})` : undefined}
              >
                {c.texto}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
