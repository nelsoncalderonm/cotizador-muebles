// Generación de PDFs 100 % con código (jsPDF): orden de corte para el proveedor, cotización para el cliente y planos de armado.

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { colorMuebleRgb } from "./colores";
import type { DatosCliente, DatosTaller } from "./estado";
import { formatoDinero, mm } from "./estado";
import type { Lamina } from "./motor/optimizador";
import { textoCantos, type Precios, type ResultadoProyecto } from "./motor/proyecto";
import type { Configuracion, ResultadoMueble } from "./motor/tipos";

const ACENTO: [number, number, number] = [11, 31, 58];
const MENTA: [number, number, number] = [0, 217, 163];
const GRIS: [number, number, number] = [90, 90, 90];

const hoy = () => new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });

/** Logo del taller y fotos de trabajos, si el carpintero las subió. */
export interface ImagenesTaller {
  logo?: string | null;
  trabajos?: { url: string; titulo: string }[];
}

function encabezado(doc: jsPDF, titulo: string, taller: DatosTaller, cliente: DatosCliente, logo?: string | null) {
  const w = doc.internal.pageSize.getWidth();
  let x = 14;
  if (logo) {
    try {
      const p = doc.getImageProperties(logo);
      const alto = 18;
      const ancho = Math.min(40, (p.width / p.height) * alto);
      doc.addImage(logo, "JPEG", 14, 8, ancho, (p.height / p.width) * ancho);
      x = 14 + ancho + 5;
    } catch {
      /* logo dañado: se omite */
    }
  }
  doc.setFillColor(...ACENTO);
  doc.rect(0, 0, w, 3, "F");
  doc.setFillColor(...MENTA);
  doc.rect(0, 3, w, 0.8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text(titulo, x, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  const izq = [taller.nombre || "Mi taller", [taller.telefono, taller.ciudad].filter(Boolean).join(" · ")].filter(Boolean);
  doc.text(izq, x, 21);
  const der = [`Fecha: ${hoy()}`, cliente.proyecto ? `Proyecto: ${cliente.proyecto}` : "", cliente.cliente ? `Cliente: ${cliente.cliente}` : ""].filter(Boolean);
  doc.text(der, w - 14, 15, { align: "right" });
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 30, w - 14, 30);
  doc.setTextColor(30, 30, 30);
  return 36;
}

function pies(doc: jsPDF) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${n}`, w - 14, h - 8, { align: "right" });
    doc.text("Medidas en milímetros · Hecho con INNER Muebles", 14, h - 8);
  }
}

/** Dibuja la vista frontal de un mueble dentro de un recuadro. */
export function dibujarVista(doc: jsPDF, vista: ResultadoMueble["vista"], x: number, y: number, w: number, h: number, frentes: boolean, cotas = true) {
  const pad = cotas ? 9 : 2;
  const esc = Math.min((w - pad * 2) / vista.ancho, (h - pad * 2) / vista.alto);
  const ox = x + (w - vista.ancho * esc) / 2;
  const oy = y + (h - vista.alto * esc) / 2;
  const X = (v: number) => ox + v * esc;
  const Y = (v: number) => oy + (vista.alto - v) * esc;
  const orden = { detalle: 0, estructura: 1, frente: 2 } as const;
  const rects = vista.rects.filter((r) => frentes || r.tipo !== "frente").sort((a, b) => orden[a.tipo] - orden[b.tipo]);
  doc.setLineWidth(0.2);
  for (const r of rects) {
    if (r.tipo === "detalle") {
      doc.setFillColor(245, 240, 232);
      doc.setDrawColor(190, 180, 165);
    } else if (r.tipo === "estructura") {
      doc.setFillColor(233, 205, 160);
      doc.setDrawColor(90, 60, 30);
    } else {
      doc.setFillColor(250, 243, 232);
      doc.setDrawColor(90, 60, 30);
    }
    doc.rect(X(r.x), Y(r.y + r.h), r.w * esc, r.h * esc, "FD");
    if (r.tipo === "frente" && r.etiqueta && r.w * esc > 8 && r.h * esc > 5) {
      doc.setFontSize(7);
      doc.setTextColor(120, 90, 60);
      doc.text(r.etiqueta, X(r.x + r.w / 2), Y(r.y + r.h / 2), { align: "center", baseline: "middle" });
    }
  }
  if (cotas) {
    doc.setDrawColor(40, 40, 40);
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(7.5);
    for (const c of vista.cotas) {
      const dx = c.x2 - c.x1, dy = c.y2 - c.y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const d = 4 / esc;
      const a = { x: X(c.x1 + nx * d), y: Y(c.y1 + ny * d) };
      const b = { x: X(c.x2 + nx * d), y: Y(c.y2 + ny * d) };
      doc.line(X(c.x1 + nx * 1 / esc), Y(c.y1 + ny * 1 / esc), a.x + nx, a.y - ny);
      doc.line(X(c.x2 + nx * 1 / esc), Y(c.y2 + ny * 1 / esc), b.x + nx, b.y - ny);
      doc.line(a.x, a.y, b.x, b.y);
      const vertical = Math.abs(dx) < Math.abs(dy);
      const mx = (a.x + b.x) / 2 + nx * 1.6, my = (a.y + b.y) / 2 - ny * 1.6;
      doc.text(c.texto, mx, my, vertical ? { angle: 90, align: "center", baseline: "bottom" } : { align: "center", baseline: "bottom" });
    }
  }
}

function dibujarLamina(doc: jsPDF, lamina: Lamina, x: number, y: number, w: number, h: number) {
  const esc = Math.min(w / lamina.largo, h / lamina.ancho);
  doc.setLineWidth(0.25);
  doc.setFillColor(238, 238, 238);
  doc.setDrawColor(60, 60, 60);
  doc.rect(x, y, lamina.largo * esc, lamina.ancho * esc, "FD");
  for (const p of lamina.piezas) {
    doc.setFillColor(...colorMuebleRgb(p.ref));
    doc.rect(x + p.x * esc, y + p.y * esc, p.w * esc, p.h * esc, "FD");
    const pw = p.w * esc, ph = p.h * esc;
    const largo = p.rotada ? p.h : p.w;
    const ancho = p.rotada ? p.w : p.h;
    const cx = x + (p.x + p.w / 2) * esc, cy = y + (p.y + p.h / 2) * esc;
    const vertical = ph > pw * 1.6 && pw < 18;
    const espacio = vertical ? ph : pw;
    const alto = vertical ? pw : ph;
    if (alto < 3 || espacio < 6) continue;
    const fs = Math.max(5, Math.min(9, alto * 1.4, espacio / 1.3));
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fs);
    const opts = vertical ? { angle: 90, align: "center" as const } : { align: "center" as const };
    const dos = alto > fs * 0.85 && espacio > 14;
    if (vertical) {
      doc.text(p.ref, cx + (dos ? -fs * 0.05 : fs * 0.12), cy, opts);
      if (dos) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(fs * 0.8);
        doc.text(`${mm(largo)}×${mm(ancho)}`, cx + fs * 0.35, cy, opts);
      }
    } else {
      doc.text(p.ref, cx, cy + (dos ? -fs * 0.05 : fs * 0.12), opts);
      if (dos) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(fs * 0.8);
        doc.text(`${mm(largo)}×${mm(ancho)}`, cx, cy + fs * 0.35, opts);
      }
    }
  }
  doc.setFont("helvetica", "normal");
}

/** PDF para el proveedor que corta y cantea: lista de cortes + mapa de cada lámina. */
export function pdfProveedor(r: ResultadoProyecto, cfg: Configuracion, taller: DatosTaller, cliente: DatosCliente, logo?: string | null) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = encabezado(doc, "Orden de corte y canteado", taller, cliente, logo);
  doc.setFontSize(9);
  doc.text(
    [
      `Sierra: ${cfg.sierra} mm · Refilado: ${cfg.refilado} mm por borde · Canto: ${cfg.espesorCanto} mm (las medidas de corte ya descuentan el canto)`,
      `Total canto: ${mm(r.metrosCanto)} m · Láminas: ${r.materiales.map((m) => `${m.laminas.length} de ${m.nombre}`).filter((t) => !t.startsWith("0 ")).join(", ")}`,
    ],
    14,
    y,
  );
  y += 12;
  for (const m of r.materiales) {
    const filas = r.cortes.filter((f) => f.material === m.clave);
    if (!filas.length) continue;
    const mat = cfg.materiales[m.clave];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${m.nombre} · lámina ${mat.largoLamina}×${mat.anchoLamina} · ${m.laminas.length} lámina(s)${mat.veta ? " · respetar veta" : ""}`, 14, y);
    doc.setFont("helvetica", "normal");
    autoTable(doc, {
      startY: y + 2,
      head: [["Código", "Pieza", "Mueble", "Largo", "Ancho", "Cant.", "Canto"]],
      body: filas.map((f) => [f.codigo, f.pieza, f.mueble, mm(f.largoCorte), mm(f.anchoCorte), String(f.cantidad), textoCantos(f.cantos)]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: ACENTO },
      columnStyles: { 3: { halign: "right", fontStyle: "bold" }, 4: { halign: "right", fontStyle: "bold" }, 5: { halign: "center" } },
      margin: { left: 14, right: 14 },
    });
    // @ts-expect-error lastAutoTable lo agrega el plugin
    y = doc.lastAutoTable.finalY + 10;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  }
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text("Canto: \"largo\" = arista del lado largo de la pieza; \"corto\" = arista del lado corto. Las medidas de la tabla son de corte.", 14, Math.min(y, 285));

  for (const m of r.materiales) {
    for (const l of m.laminas) {
      doc.addPage("a4", "landscape");
      const W = doc.internal.pageSize.getWidth();
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(`${m.nombre} · Lámina ${l.numero} de ${m.laminas.length}`, 14, 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...GRIS);
      doc.text(`${l.largo}×${l.ancho} mm · ${l.piezas.length} piezas · aprovechamiento ${Math.round(l.aprovechamiento * 100)} %`, W - 14, 14, { align: "right" });
      dibujarLamina(doc, l, 14, 20, W - 28, 180);
    }
  }
  pies(doc);
  return doc;
}

/** PDF de cotización para el cliente final. */
export function pdfCotizacion(r: ResultadoProyecto, precios: Precios, taller: DatosTaller, cliente: DatosCliente, detallado: boolean, imagenes: Record<string, string> = {}, propias: ImagenesTaller = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = encabezado(doc, "Cotización", taller, cliente, propias.logo);
  const $ = (n: number) => formatoDinero(n, precios);
  const W = doc.internal.pageSize.getWidth();
  const factor = r.costoTotal > 0 ? r.subtotal / r.costoTotal : 1;

  for (const m of r.muebles) {
    if (y > 215) {
      doc.addPage();
      y = 20;
    }
    const v = m.resultado.vista;
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(14, y, W - 28, 60, 2, 2, "S");
    const foto = imagenes[m.item.uid];
    // Imagen 3D del mueble; si el equipo no pudo dibujarla, queda el dibujo de frente
    if (foto) doc.addImage(foto, "JPEG", 16, y + 2, 74.7, 56);
    else dibujarVista(doc, v, 16, y + 2, 74.7, 56, true, false);
    const tx = 96;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(`${m.item.cantidad} × ${m.item.nombre}`, tx, y + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    const alto = v.alto, ancho = v.ancho;
    const fondo = Number(m.item.valores.fondo ?? 0);
    doc.text([m.nombreMueble, `Ancho: ${mm(ancho)} mm`, `Alto: ${mm(alto)} mm`, `Fondo: ${mm(fondo)} mm`], tx, y + 16);
    y += 66;
  }

  if (detallado) {
    autoTable(doc, {
      startY: y,
      head: [["Concepto", "Cant.", "Valor unitario", "Total"]],
      body: r.costos.map((c) => [c.concepto, mm(c.cantidad), $(c.unitario * factor), $(c.total * factor)]),
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: ACENTO },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });
    // @ts-expect-error lastAutoTable lo agrega el plugin
    y = doc.lastAutoTable.finalY + 6;
  }
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  const filas: [string, string][] = [];
  if (detallado) filas.push(["Materiales y herrajes", $(r.subtotalMateriales * factor)], ["Fabricación e instalación", $((r.manoObra + r.otrosCostos) * factor)]);
  filas.push(["Subtotal", $(r.subtotal)]);
  if (precios.impuestoPorcentaje > 0) filas.push([`Impuesto (${precios.impuestoPorcentaje} %)`, $(r.impuesto)]);
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  for (const [k, v] of filas) {
    doc.text(k, W - 80, y);
    doc.text(v, W - 14, y, { align: "right" });
    y += 6;
  }
  doc.setFillColor(...ACENTO);
  doc.roundedRect(W - 84, y - 3, 70, 11, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL", W - 80, y + 4.5);
  doc.text($(r.total), W - 17, y + 4.5, { align: "right" });
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  const notas = [`Cotización válida por ${cliente.validezDias} días.`, ...(cliente.notas ? cliente.notas.split("\n") : [])];
  doc.text(doc.splitTextToSize(notas.join("\n"), W - 28), 14, y);
  if (propias.trabajos?.length) trabajosAnteriores(doc, propias.trabajos, taller);
  pies(doc);
  return doc;
}

/** Página con fotos de trabajos que el taller ya hizo. */
function trabajosAnteriores(doc: jsPDF, trabajos: { url: string; titulo: string }[], taller: DatosTaller) {
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...ACENTO);
  doc.rect(0, 0, W, 3, "F");
  doc.setFillColor(...MENTA);
  doc.rect(0, 3, W, 0.8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text("Algunos de nuestros trabajos", 14, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(taller.nombre ? `Muebles fabricados por ${taller.nombre}` : "Muebles fabricados por nuestro taller", 14, 23);
  const gap = 6;
  const ancho = (W - 28 - gap) / 2;
  const alto = ancho * 0.75;
  trabajos.slice(0, 6).forEach((t, i) => {
    const x = 14 + (i % 2) * (ancho + gap);
    const y = 30 + Math.floor(i / 2) * (alto + 14);
    try {
      const p = doc.getImageProperties(t.url);
      // recorte centrado a 4:3 para que todas las fotos queden parejas
      const r = p.width / p.height;
      doc.saveGraphicsState();
      doc.roundedRect(x, y, ancho, alto, 2, 2, null as unknown as string);
      doc.clip();
      doc.discardPath();
      if (r > 4 / 3) {
        const w = alto * r;
        doc.addImage(t.url, "JPEG", x - (w - ancho) / 2, y, w, alto);
      } else {
        const h = ancho / r;
        doc.addImage(t.url, "JPEG", x, y - (h - alto) / 2, ancho, h);
      }
      doc.restoreGraphicsState();
    } catch {
      return;
    }
    if (t.titulo) {
      doc.setFontSize(9.5);
      doc.setTextColor(30, 30, 30);
      doc.text(t.titulo, x, y + alto + 5);
    }
  });
}

/** Planos de fabricación: por mueble, vistas con cotas, despiece y pasos de armado. */
export function pdfPlanos(r: ResultadoProyecto, taller: DatosTaller, cliente: DatosCliente) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let primera = true;
  r.muebles.forEach((m, idx) => {
    if (!primera) doc.addPage();
    primera = false;
    let y = encabezado(doc, `Plano ${idx + 1}: ${m.item.nombre}`, taller, cliente);
    const W = doc.internal.pageSize.getWidth();
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.text(`${m.nombreMueble} · cantidad: ${m.item.cantidad}`, 14, y);
    y += 3;
    const mitad = (W - 32) / 2;
    dibujarVista(doc, m.resultado.vista, 14, y, mitad, 85, false);
    dibujarVista(doc, m.resultado.vista, 18 + mitad, y, mitad, 85, true);
    doc.setFontSize(8);
    doc.text("Estructura", 14 + mitad / 2, y + 88, { align: "center" });
    doc.text("Con frentes", 18 + mitad * 1.5, y + 88, { align: "center" });
    y += 94;
    const filas = r.cortes.filter((f) => f.codigo.startsWith(`${idx + 1}.`));
    autoTable(doc, {
      startY: y,
      head: [["Código", "Pieza", "Terminada", "Corte", "Cant.", "Canto", "Nota"]],
      body: filas.map((f) => [f.codigo, f.pieza, `${mm(f.largoTerminado)}×${mm(f.anchoTerminado)}`, `${mm(f.largoCorte)}×${mm(f.anchoCorte)}`, String(f.cantidad), textoCantos(f.cantos), f.nota ?? ""]),
      styles: { fontSize: 7.5, cellPadding: 1.2 },
      headStyles: { fillColor: ACENTO },
      margin: { left: 14, right: 14 },
    });
    // @ts-expect-error lastAutoTable lo agrega el plugin
    y = doc.lastAutoTable.finalY + 8;
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    doc.text("Pasos de armado", 14, y);
    y += 6;
    m.resultado.pasos.forEach((p, i) => {
      const lineas = doc.splitTextToSize(p.descripcion, W - 34);
      if (y + 6 + lineas.length * 4 > 285) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setFillColor(...ACENTO);
      doc.circle(17, y - 1.2, 2.6, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(String(i + 1), 17, y - 0.2, { align: "center" });
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9.5);
      doc.text(p.titulo, 22, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...GRIS);
      doc.text(lineas, 22, y + 4.5);
      y += 7 + lineas.length * 3.8;
    });
    const herr = m.resultado.herrajes.map((h) => `${mm(h.cantidad * m.item.cantidad)} ${h.unidad} ${h.nombre}`);
    if (herr.length) {
      if (y + 10 + herr.length * 3.8 > 285) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text("Herrajes", 14, y + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...GRIS);
      doc.text(herr, 14, y + 7);
    }
  });
  pies(doc);
  return doc;
}

/** Comparte el PDF (WhatsApp, correo…) en celulares, o lo descarga en computador. */
export async function compartirPdf(doc: jsPDF, nombre: string) {
  const blob = doc.output("blob");
  const archivo = new File([blob], nombre, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (esMovil && nav.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombre });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
  doc.save(nombre);
}
