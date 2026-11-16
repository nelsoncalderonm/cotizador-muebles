import type { DatosCliente, DatosTaller } from "./estado";
import { formatoDinero, mm } from "./estado";
import type { Precios, ResultadoProyecto } from "./motor/proyecto";

const fecha = (d: Date) => d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

/** Número corto de cotización a partir de la fecha y hora: COT-1116-0957. */
export function numeroCotizacion(d = new Date()) {
  const dos = (n: number) => String(n).padStart(2, "0");
  return `COT-${dos(d.getMonth() + 1)}${dos(d.getDate())}-${dos(d.getHours())}${dos(d.getMinutes())}`;
}

export function validaHasta(cliente: DatosCliente) {
  const d = new Date();
  d.setDate(d.getDate() + (cliente.validezDias || 0));
  return fecha(d);
}

/** Anticipo y saldo según el porcentaje elegido. */
export function pagos(total: number, cliente: DatosCliente) {
  const pct = Math.min(100, Math.max(0, cliente.anticipoPorcentaje || 0));
  const anticipo = Math.round(total * (pct / 100));
  return { pct, anticipo, saldo: total - anticipo };
}

/** Condiciones que van en el PDF y en el resumen, en el orden en que el cliente las lee. */
export function condiciones(r: ResultadoProyecto, precios: Precios, cliente: DatosCliente): string[] {
  const $ = (n: number) => formatoDinero(n, precios);
  const { pct, anticipo, saldo } = pagos(r.total, cliente);
  const lineas: string[] = [];
  if (pct > 0 && pct < 100) lineas.push(`Anticipo del ${pct} % para empezar: ${$(anticipo)}. Saldo de ${$(saldo)} contra entrega.`);
  else if (pct === 100) lineas.push(`Pago del 100 % para empezar: ${$(r.total)}.`);
  if (cliente.entregaDias > 0) lineas.push(`Fabricación e instalación en ${cliente.entregaDias} días hábiles después del anticipo.`);
  lineas.push(`Precio válido hasta el ${validaHasta(cliente)}.`);
  return lineas;
}

/** Mensaje de WhatsApp que acompaña al PDF. Si el carpintero escribió uno propio, se usa ese. */
export function mensajeCliente(r: ResultadoProyecto, precios: Precios, cliente: DatosCliente, taller: DatosTaller) {
  if (cliente.mensaje.trim()) return cliente.mensaje;
  const $ = (n: number) => formatoDinero(n, precios);
  const nombre = cliente.cliente.trim().split(/\s+/)[0];
  const { pct, anticipo } = pagos(r.total, cliente);
  return [
    `Hola${nombre ? ` ${nombre}` : ""}, te comparto la cotización${cliente.proyecto ? ` de *${cliente.proyecto}*` : ""} con el diseño en 3D.`,
    "",
    ...r.muebles.map((m) => `• ${m.item.cantidad} × ${m.item.nombre} (${mm(m.resultado.vista.ancho)} × ${mm(m.resultado.vista.alto)} mm)`),
    "",
    `*Total: ${$(r.total)}*`,
    pct > 0 && pct < 100 ? `Para empezar: anticipo del ${pct} % (${$(anticipo)}).` : "",
    cliente.entregaDias > 0 ? `Entrega en ${cliente.entregaDias} días hábiles.` : "",
    `Precio válido hasta el ${validaHasta(cliente)}.`,
    "",
    "Si estás de acuerdo, respóndeme *APROBADO* y agendamos.",
    taller.nombre ? `${taller.nombre}${taller.telefono ? ` · ${taller.telefono}` : ""}` : "",
  ]
    .filter((l, i, a) => l !== "" || (a[i - 1] !== "" && i > 0))
    .join("\n")
    .trim();
}
