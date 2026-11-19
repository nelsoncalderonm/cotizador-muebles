// Link "No quiero recibir más correos" de los correos semanales. GET (clic) y POST (botón de baja del correo).

import { firmaValida } from "@/lib/correos/enviar";

export const runtime = "nodejs";

async function darDeBaja(req: Request) {
  const q = new URL(req.url).searchParams;
  const correo = (q.get("c") ?? "").trim().toLowerCase();
  const firma = q.get("f") ?? "";
  const token = process.env.CORREOS_TOKEN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_KEY;
  if (!token || !url || !clave || !correo || !firmaValida(correo, firma, token)) return { ok: false, estado: 400 };
  const r = await fetch(`${url}/rest/v1/rpc/im_correo_baja`, {
    method: "POST",
    headers: { apikey: clave, Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ token, p_correo: correo }),
  });
  return { ok: r.ok, estado: r.ok ? 200 : 500 };
}

const pagina = (titulo: string, texto: string, estado: number) =>
  new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title></head>
<body style="font-family:Arial,sans-serif;max-width:480px;margin:60px auto;padding:0 16px;color:#1c1917"><h1 style="font-size:22px">${titulo}</h1><p style="font-size:17px;line-height:1.5">${texto}</p>
<p><a href="https://muebles.innergrowth.pro/app" style="color:#c2410c">Ir a INNER Muebles</a></p></body></html>`,
    { status: estado, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } },
  );

export async function GET(req: Request) {
  const { ok, estado } = await darDeBaja(req);
  return ok
    ? pagina("Listo, no te mandaremos más correos", "Tu suscripción sigue activa y puedes seguir usando la app normal. Si cambias de opinión, escríbenos por WhatsApp.", 200)
    : pagina("No pudimos procesar el link", "Escríbenos por WhatsApp y te sacamos de la lista a mano.", estado);
}

export async function POST(req: Request) {
  const { ok, estado } = await darDeBaja(req);
  return new Response(null, { status: ok ? 200 : estado });
}
