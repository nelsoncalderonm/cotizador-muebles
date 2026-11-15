// Aviso de pagos de Hotmart (webhook 2.0): activa, renueva o cancela la suscripción del comprador.
// Hotmart envía su token en la cabecera X-HOTMART-HOTTOK; la base de datos lo compara con el guardado.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_KEY;
  if (!url || !clave) return NextResponse.json({ error: "Cuentas sin configurar" }, { status: 503 });
  let carga: Record<string, unknown>;
  try {
    carga = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const token = req.headers.get("x-hotmart-hottok") || (typeof carga.hottok === "string" ? carga.hottok : "");
  if (!token) return NextResponse.json({ error: "Falta el token" }, { status: 401 });
  const r = await fetch(`${url}/rest/v1/rpc/hotmart_evento`, {
    method: "POST",
    headers: { apikey: clave, Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ token, carga }),
  });
  if (!r.ok) {
    const texto = await r.text();
    return NextResponse.json({ error: texto.includes("Token") ? "Token inválido" : "No se pudo registrar" }, { status: texto.includes("Token") ? 401 : 500 });
  }
  return NextResponse.json({ ok: true, resultado: await r.json() });
}
