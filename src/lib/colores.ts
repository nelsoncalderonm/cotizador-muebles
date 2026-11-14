// Colores suaves para distinguir las piezas de cada mueble (por el número antes del punto del código).
const PALETA = ["#f6d7a7", "#cfe3c2", "#c9dcf2", "#f2c9d4", "#e3d4f2", "#f2e6b8", "#bfe6e3", "#f2d0bf"];
const PALETA_RGB: [number, number, number][] = PALETA.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

function indice(ref: string) {
  const n = parseInt(ref.split(".")[0], 10);
  return isNaN(n) ? 0 : (n - 1) % PALETA.length;
}

export const colorMueble = (ref: string) => PALETA[indice(ref)];
export const colorMuebleRgb = (ref: string) => PALETA_RGB[indice(ref)];
