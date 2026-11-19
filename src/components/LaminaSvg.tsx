import type { Lamina } from "@/lib/motor/optimizador";
import { colorMueble } from "@/lib/colores";

export function LaminaSvg({ lamina, veta = false }: { lamina: Lamina; veta?: boolean }) {
  const { largo: L, ancho: W } = lamina;
  return (
    <svg viewBox={`-10 -10 ${L + 20} ${W + 20}`} style={{ width: "100%", height: "auto" }} role="img" aria-label={`Lámina ${lamina.numero}`}>
      {veta && (
        <defs>
          {/* veta en el sentido del largo de la lámina */}
          <pattern id={`veta-${lamina.numero}`} width={120} height={34} patternUnits="userSpaceOnUse">
            <path d="M0 10 Q30 4 60 10 T120 10 M0 27 Q30 33 60 27 T120 27" fill="none" stroke="#8a6238" strokeOpacity={0.45} strokeWidth={3} />
          </pattern>
        </defs>
      )}
      <rect x={0} y={0} width={L} height={W} className="lam-fondo" vectorEffect="non-scaling-stroke" />
      {lamina.piezas.map((p, i) => {
        const fs = Math.min(70, Math.max(26, Math.min(p.w, p.h) / 4.2));
        const cabeDos = p.h > fs * 2.6 && p.w > fs * 3.5;
        const vertical = p.h > p.w * 1.6 && p.w < fs * 5;
        const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
        const largo = p.rotada ? p.h : p.w;
        const ancho = p.rotada ? p.w : p.h;
        return (
          <g key={i}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={colorMueble(p.ref)} className="lam-pieza" vectorEffect="non-scaling-stroke" />
            {veta && <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={`url(#veta-${lamina.numero})`} pointerEvents="none" />}
            {Math.min(p.w, p.h) > 60 && (
              <text
                x={cx}
                y={cy}
                fontSize={fs}
                textAnchor="middle"
                className="lam-txt"
                transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}
              >
                <tspan x={cx} dy={cabeDos || vertical ? -fs * 0.2 : fs * 0.35} fontWeight={700}>
                  {p.ref}
                </tspan>
                {(cabeDos || vertical) && (
                  <tspan x={cx} dy={fs * 1.1} fontSize={fs * 0.8}>
                    {Math.round(largo * 10) / 10}×{Math.round(ancho * 10) / 10}
                  </tspan>
                )}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
