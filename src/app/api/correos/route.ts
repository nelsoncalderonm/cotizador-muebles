// Correos semanales a suscriptores. Vercel Cron la llama todos los días a las 7 a.m. de Bogotá (vercel.json):
// bienvenida a quien acaba de entrar y, los martes, el correo de la semana (o uno de rescate si no usa la app).
//
// Variables en Vercel:
//   CRON_SECRET          Vercel la manda sola en la llamada del cron
//   RESEND_API_KEY       clave de Resend
//   CORREOS_TOKEN        el mismo valor guardado en inner_muebles.ajustes ('correos_token')
//   CORREOS_REMITENTE    p. ej. "Nelson de INNER Muebles <hola@innergrowth.pro>"
//   CORREOS_RESPONDER_A  correo donde llegan las respuestas (opcional)
//   CORREOS_MODO         "real" envía a los suscriptores; cualquier otro valor = prueba
//   CORREOS_PRUEBA       en modo prueba, todo llega solo a este correo
//
// Extras (con el mismo Authorization):
//   ?vista=bienvenida | semana-3 | rescate   devuelve el HTML de ese correo
//   ?todos=1   (modo prueba) manda todos los correos de la secuencia al correo de prueba
//   ?martes=1  fuerza el envío semanal aunque hoy no sea martes

import { NextResponse } from "next/server";
import { correoDeHoy, enviarResend, firmaBaja, primerNombre, renderizar, type Suscriptor } from "@/lib/correos/enviar";
import { BIENVENIDA, RESCATE, SEMANAS, TIPS, type Correo } from "@/lib/correos/plantillas";

export const runtime = "nodejs";
export const maxDuration = 300;

const BASE = "https://muebles.innergrowth.pro";

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_KEY!;
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: clave, Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ token: process.env.CORREOS_TOKEN, ...args }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`${fn}: ${r.status} ${await r.text()}`);
  return r.json();
}

function plantilla(clave: string): Correo | null {
  if (clave === "bienvenida") return BIENVENIDA;
  if (clave.startsWith("rescate")) return RESCATE;
  const n = Number(clave.replace("semana-", ""));
  if (!Number.isInteger(n) || n < 1) return null;
  return n <= SEMANAS.length ? SEMANAS[n - 1] : TIPS[(n - SEMANAS.length - 1) % TIPS.length];
}

const urlBaja = (correo: string) =>
  `${BASE}/api/correos/baja?c=${encodeURIComponent(correo)}&f=${firmaBaja(correo, process.env.CORREOS_TOKEN!)}`;

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const faltan = ["RESEND_API_KEY", "CORREOS_TOKEN", "CORREOS_REMITENTE", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_KEY"].filter((k) => !process.env[k]);
  if (faltan.length) return NextResponse.json({ error: `Faltan variables: ${faltan.join(", ")}` }, { status: 503 });

  const q = new URL(req.url).searchParams;
  const real = process.env.CORREOS_MODO === "real";
  const prueba = process.env.CORREOS_PRUEBA;
  const de = process.env.CORREOS_REMITENTE!;
  const responderA = process.env.CORREOS_RESPONDER_A;

  const vista = q.get("vista");
  if (vista) {
    const c = plantilla(vista);
    if (!c) return NextResponse.json({ error: "Correo desconocido" }, { status: 404 });
    return new Response(renderizar(c, "Carlos", urlBaja("ejemplo@correo.com")).html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  if (!real && !prueba) return NextResponse.json({ error: "Modo prueba sin CORREOS_PRUEBA" }, { status: 503 });

  if (q.get("todos") === "1") {
    if (real) return NextResponse.json({ error: "Solo en modo prueba" }, { status: 400 });
    const claves = ["bienvenida", ...SEMANAS.map((_, i) => `semana-${i + 1}`), ...TIPS.map((_, i) => `semana-${SEMANAS.length + i + 1}`), "rescate"];
    for (const clave of claves) {
      const { asunto, html, texto } = renderizar(plantilla(clave)!, "Carlos", urlBaja(prueba!));
      await enviarResend({ de, responderA, para: prueba!, asunto: `[PRUEBA ${clave}] ${asunto}`, html, texto, urlBaja: urlBaja(prueba!) });
      await new Promise((r) => setTimeout(r, 600));
    }
    return NextResponse.json({ ok: true, enviados: claves.length, a: prueba });
  }

  const ahora = new Date();
  const martes = q.get("martes") === "1" || new Date(ahora.getTime() - 5 * 3_600_000).getUTCDay() === 2;
  const suscriptores = await rpc<Suscriptor[]>("im_correos_pendientes", {});
  const tocan = suscriptores.flatMap((s) => {
    const hoy = correoDeHoy(s, ahora, martes);
    return hoy ? [{ s, ...hoy }] : [];
  });

  if (!real) {
    // Prueba: no anota nada; manda a tu correo hasta 5 de los que saldrían hoy
    for (const t of tocan.slice(0, 5)) {
      const { asunto, html, texto } = renderizar(t.correo, primerNombre(t.s.nombre), urlBaja(prueba!));
      await enviarResend({ de, responderA, para: prueba!, asunto: `[PRUEBA → ${t.s.correo} · ${t.clave}] ${asunto}`, html, texto, urlBaja: urlBaja(prueba!) });
      await new Promise((r) => setTimeout(r, 600));
    }
    return NextResponse.json({ modo: "prueba", martes, saldrian: tocan.map((t) => ({ correo: t.s.correo, clave: t.clave })) });
  }

  const enviados: string[] = [];
  const errores: string[] = [];
  for (const t of tocan) {
    try {
      const nuevo = await rpc<boolean>("im_correo_registrar", { p_correo: t.s.correo, p_clave: t.clave });
      if (!nuevo) continue;
      const { asunto, html, texto } = renderizar(t.correo, primerNombre(t.s.nombre), urlBaja(t.s.correo));
      try {
        await enviarResend({ de, responderA, para: t.s.correo, asunto, html, texto, urlBaja: urlBaja(t.s.correo) });
        enviados.push(`${t.s.correo} ${t.clave}`);
      } catch (e) {
        await rpc("im_correo_desanotar", { p_correo: t.s.correo, p_clave: t.clave }).catch(() => {});
        throw e;
      }
    } catch (e) {
      errores.push(`${t.s.correo} ${t.clave}: ${(e as Error).message.slice(0, 200)}`);
    }
    await new Promise((r) => setTimeout(r, 550)); // Resend permite 2 por segundo
  }
  return NextResponse.json({ modo: "real", martes, enviados: enviados.length, errores });
}
