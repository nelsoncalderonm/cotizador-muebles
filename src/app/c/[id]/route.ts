/** Link corto de una cotización en PDF: muebles.innergrowth.pro/c/<uuid>. El uuid es aleatorio, así que solo la abre quien tiene el link. */

// WhatsApp, Facebook y otros piden el link solo para armar la vista previa: eso no es el cliente abriéndola
const ROBOT = /bot|crawl|spider|preview|whatsapp|facebookexternalhit|facebot|telegram|slack|discord|skype|curl|wget|python|headless|lighthouse/i;

async function contarVista(id: string, req: Request) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_KEY;
  const url = new URL(req.url);
  if (!base || !clave || url.searchParams.has("yo") || ROBOT.test(req.headers.get("user-agent") || "")) return;
  // el navegador pide el PDF por partes; solo cuenta la primera petición
  const rango = req.headers.get("range");
  if (rango && !/^bytes=0-/.test(rango)) return;
  await fetch(`${base}/rest/v1/rpc/im_cotizacion_vista`, {
    method: "POST",
    headers: { apikey: clave, authorization: `Bearer ${clave}`, "content-type": "application/json" },
    body: JSON.stringify({ p_id: id }),
    cache: "no-store",
  }).catch(() => {});
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !/^[0-9a-f-]{36}$/.test(id)) return new Response("Cotización no encontrada", { status: 404 });
  const [r] = await Promise.all([fetch(`${base}/storage/v1/object/public/inner-muebles-cotizaciones/c/${id}.pdf`, { cache: "no-store" }), contarVista(id, req)]);
  if (!r.ok || !r.body) return new Response("Esta cotización ya no está disponible. Pídele al carpintero que te la envíe de nuevo.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(r.body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'inline; filename="cotizacion.pdf"',
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
