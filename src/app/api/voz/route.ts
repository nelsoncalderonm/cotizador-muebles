// Transcripción de notas de voz (Whisper / gpt-4o-mini-transcribe de OpenAI).
// Solo convierte audio en texto; la interpretación de medidas se hace con reglas en el navegador.

export const runtime = "nodejs";
export const maxDuration = 30;

const VOCABULARIO =
  "Carpintería en melamina: mueble bajo de cocina, aéreo, closet, ropero, librero, repisa, escritorio, mesa de noche, cajonera, " +
  "entrepaños, zócalo, cajones, puertas, fondo, ancho, alto, centímetros, milímetros, metros, cuerpos, maletero, tubo colgador.";

export async function POST(req: Request) {
  const clave = process.env.OPENAI_API_KEY;
  if (!clave) {
    return Response.json({ error: "La transcripción de voz no está configurada (falta OPENAI_API_KEY)." }, { status: 503 });
  }
  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return Response.json({ error: "No llegó el audio." }, { status: 400 });
  if (audio.size > 8 * 1024 * 1024) return Response.json({ error: "La nota es muy larga (máx. ~1 minuto)." }, { status: 413 });

  const nombre = audio instanceof File && audio.name ? audio.name : "nota.webm";
  const salida = new FormData();
  salida.append("file", audio, nombre);
  salida.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
  salida.append("language", "es");
  salida.append("prompt", VOCABULARIO);
  salida.append("response_format", "json");

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${clave}` },
    body: salida,
  });
  if (!r.ok) {
    console.error("Error de transcripción", r.status, await r.text().catch(() => ""));
    return Response.json({ error: "No se pudo transcribir la nota. Intenta de nuevo." }, { status: 502 });
  }
  const datos = (await r.json()) as { text?: string };
  return Response.json({ texto: (datos.text ?? "").trim() });
}
