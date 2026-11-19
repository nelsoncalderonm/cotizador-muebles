// Foto de referencia: un modelo con visión mira la foto y elige del catálogo el mueble, medidas y colores
// para replicarlo. El cálculo de cortes y precios lo sigue haciendo el motor, sin IA.

import { extraerJson, promptReferencia, validarPropuesta } from "@/lib/referencia";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(req: Request) {
  const clave = process.env.OPENROUTER_API_KEY;
  if (!clave) return Response.json({ error: "La lectura de fotos no está configurada todavía." }, { status: 503 });

  let cuerpo: { imagen?: unknown; nota?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return Response.json({ error: "No llegó la foto." }, { status: 400 });
  }
  const imagen = typeof cuerpo.imagen === "string" ? cuerpo.imagen : "";
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(imagen)) return Response.json({ error: "No llegó la foto." }, { status: 400 });
  if (imagen.length > 3_000_000) return Response.json({ error: "La foto es muy pesada." }, { status: 413 });
  const nota = typeof cuerpo.nota === "string" ? cuerpo.nota.trim().slice(0, 400) : "";

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json", "X-Title": "INNER Muebles" },
      body: JSON.stringify({
        model: process.env.OPENROUTER_VISION_MODEL || "google/gemini-2.5-flash",
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: promptReferencia() },
          {
            role: "user",
            content: [
              { type: "text", text: nota ? `Nota del carpintero: ${nota}` : "Replica este mueble." },
              { type: "image_url", image_url: { url: imagen } },
            ],
          },
        ],
      }),
    });
    if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${(await r.text().catch(() => "")).slice(0, 300)}`);
    const datos = (await r.json()) as { choices?: { message?: { content?: string | { text?: string }[] } }[]; error?: { message?: string } };
    if (datos.error) throw new Error(`OpenRouter: ${datos.error.message}`);
    const c = datos.choices?.[0]?.message?.content;
    const texto = typeof c === "string" ? c : (c ?? []).map((x) => x.text ?? "").join("");
    const crudo = extraerJson(texto);
    const propuesta = validarPropuesta(crudo);
    if (!propuesta) {
      const motivo = crudo && typeof crudo === "object" && typeof (crudo as { explicacion?: unknown }).explicacion === "string" ? (crudo as { explicacion: string }).explicacion : "";
      return Response.json({ error: `No encontré un mueble que replicar en la foto.${motivo ? ` (${motivo.slice(0, 200)})` : ""}` }, { status: 422 });
    }
    return Response.json({ propuesta });
  } catch (e) {
    console.error("Error foto de referencia", (e as Error).message.slice(0, 500));
    return Response.json({ error: "No se pudo leer la foto. Intenta de nuevo." }, { status: 502 });
  }
}
