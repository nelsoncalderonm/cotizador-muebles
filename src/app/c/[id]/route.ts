/** Link corto de una cotización en PDF: muebles.innergrowth.pro/c/<uuid>. El uuid es aleatorio, así que solo la abre quien tiene el link. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !/^[0-9a-f-]{36}$/.test(id)) return new Response("Cotización no encontrada", { status: 404 });
  const r = await fetch(`${base}/storage/v1/object/public/inner-muebles-cotizaciones/c/${id}.pdf`, { cache: "no-store" });
  if (!r.ok || !r.body) return new Response("Esta cotización ya no está disponible. Pídele al carpintero que te la envíe de nuevo.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(r.body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'inline; filename="cotizacion.pdf"',
      "cache-control": "private, max-age=3600",
      "x-robots-tag": "noindex",
    },
  });
}
