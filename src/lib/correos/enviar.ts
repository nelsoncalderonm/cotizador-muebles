// Arma y envía los correos semanales. Solo corre en el servidor (ruta /api/correos).

import { createHmac, timingSafeEqual } from "node:crypto";
import { BIENVENIDA, RESCATE, SEMANAS, TIPS, type Correo } from "./plantillas";

export type Suscriptor = {
  correo: string;
  nombre: string | null;
  inicio: string;
  ultimo_uso: string | null;
  segundos_uso: number;
  enviados: { clave: string; enviado: string }[];
};

const DIA = 86_400_000;

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Escapa y convierte los links sueltos en <a> */
const conLinks = (t: string) => escapar(t).replace(/https:\/\/[^\s<]+/g, (u) => `<a href="${u}" style="color:#c2410c;word-break:break-all">${u}</a>`);

export function primerNombre(nombre: string | null) {
  const n = (nombre ?? "").trim().split(/\s+/)[0] ?? "";
  if (!n || n.length > 20) return "parcero";
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
}

/** Qué correo le toca hoy a esta persona (o null si nada). `martes` = día del envío semanal. */
export function correoDeHoy(s: Suscriptor, ahora: Date, martes: boolean): { clave: string; correo: Correo } | null {
  const claves = new Set(s.enviados.map((e) => e.clave));
  if (!claves.has("bienvenida")) return { clave: "bienvenida", correo: BIENVENIDA };
  if (!martes) return null;

  const bienvenida = s.enviados.find((e) => e.clave === "bienvenida")!;
  if (ahora.getTime() - new Date(bienvenida.enviado).getTime() < 3 * DIA) return null; // que no lleguen dos seguidos

  // Rescate si lleva 7 días o más sin abrir la app, pero nunca dos semanas seguidas
  const sinUso = !s.ultimo_uso || ahora.getTime() - new Date(s.ultimo_uso).getTime() >= 7 * DIA;
  const ultimo = s.enviados[s.enviados.length - 1];
  if (sinUso && !ultimo.clave.startsWith("rescate")) {
    return { clave: `rescate-${ahora.toISOString().slice(0, 10)}`, correo: RESCATE };
  }

  const semanales = s.enviados.filter((e) => e.clave.startsWith("semana-")).length;
  const n = semanales + 1;
  const correo = n <= SEMANAS.length ? SEMANAS[n - 1] : TIPS[(n - SEMANAS.length - 1) % TIPS.length];
  return { clave: `semana-${n}`, correo };
}

// --- Link para dejar de recibir: firmado para que nadie dé de baja a otro ---
export function firmaBaja(correo: string, secreto: string) {
  return createHmac("sha256", secreto).update(correo.toLowerCase()).digest("base64url").slice(0, 22);
}
export function firmaValida(correo: string, firma: string, secreto: string) {
  const a = Buffer.from(firmaBaja(correo, secreto));
  const b = Buffer.from(firma);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function renderizar(c: Correo, nombre: string, urlBaja: string) {
  const r = (t: string) => t.replaceAll("{nombre}", nombre);
  const asunto = r(c.asunto);
  const parrafos = c.parrafos.map((p) => `<p style="margin:0 0 16px">${conLinks(r(p))}</p>`).join("");
  const posdata = c.posdata ? `<p style="margin:24px 0 0;font-size:15px;color:#57534e">${conLinks(r(c.posdata))}</p>` : "";
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(asunto)}</title></head>
<body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
<span style="display:none;max-height:0;overflow:hidden">${escapar(r(c.previa))}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px">
<tr><td style="padding:20px 28px;background:#1c1917;border-radius:12px 12px 0 0;color:#ffffff;font-weight:bold;font-size:18px;letter-spacing:1px">INNER <span style="color:#fb923c">Muebles</span></td></tr>
<tr><td style="padding:28px;font-size:17px;line-height:1.5">
${parrafos}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0"><tr><td style="background:#ea580c;border-radius:8px">
<a href="${escapar(c.boton.url)}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:17px">${escapar(c.boton.texto)}</a>
</td></tr></table>
${posdata}
</td></tr></table>
<p style="max-width:520px;margin:16px auto 0;font-size:12px;color:#78716c;line-height:1.5">Recibes este correo porque tienes una suscripción a INNER Muebles. <a href="${escapar(urlBaja)}" style="color:#78716c">No quiero recibir más correos</a></p>
</td></tr></table></body></html>`;
  const texto = [...c.parrafos.map(r), `${c.boton.texto}: ${c.boton.url}`, c.posdata ? r(c.posdata) : "", `Dejar de recibir correos: ${urlBaja}`]
    .filter(Boolean)
    .join("\n\n");
  return { asunto, html, texto };
}

export async function enviarResend(p: { de: string; responderA?: string; para: string; asunto: string; html: string; texto: string; urlBaja: string }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: p.de,
      to: [p.para],
      reply_to: p.responderA || undefined,
      subject: p.asunto,
      html: p.html,
      text: p.texto,
      headers: { "List-Unsubscribe": `<${p.urlBaja}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}
