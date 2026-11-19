// Transcripción de notas de voz. Solo convierte audio en texto; la interpretación de medidas se hace con reglas en el navegador.
// Proveedores: OpenAI (OPENAI_API_KEY, Whisper / gpt-4o-mini-transcribe) o OpenRouter (OPENROUTER_API_KEY, modelo que recibe audio).

export const runtime = "nodejs";
export const maxDuration = 30;

const VOCABULARIO =
  "Carpintería en melamina: mueble bajo de cocina, aéreo, closet, ropero, librero, repisa, escritorio, mesa de noche, cajonera, mueble de TV, rack, despensero, zapatero, vanitorio, aparador, bifé, mesa de centro, repisa flotante, nicho, luz LED, rodachinas, " +
  "entrepaños, zócalo, cajones, puertas, fondo, ancho, alto, centímetros, milímetros, metros, cuerpos, maletero, tubo colgador.";

async function conOpenAI(clave: string, audio: Blob, nombre: string) {
  const salida = new FormData();
  salida.append("file", audio, nombre);
  salida.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
  salida.append("language", "es");
  salida.append("prompt", VOCABULARIO);
  salida.append("response_format", "json");
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${clave}` }, body: salida });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text().catch(() => "")}`);
  const datos = (await r.json()) as { text?: string };
  return (datos.text ?? "").trim();
}

/** OpenRouter no tiene un servicio de transcripción aparte: se le pasa el audio a un modelo de chat que lo escucha y devuelve el texto. */
async function conOpenRouter(clave: string, audio: Blob, nombre: string) {
  const ext = (nombre.split(".").pop() || "wav").toLowerCase();
  const formato = ext === "m4a" ? "m4a" : ext === "mp3" ? "mp3" : ext === "ogg" ? "ogg" : ext === "webm" ? "webm" : "wav";
  const base64 = Buffer.from(await audio.arrayBuffer()).toString("base64");
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json", "X-Title": "INNER Muebles" },
    body: JSON.stringify({
      model: process.env.OPENROUTER_AUDIO_MODEL || "google/gemini-2.5-flash",
      temperature: 0,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            "Eres un transcriptor. Escribe exactamente lo que dice el audio, en español, con los números en cifras. " +
            "No respondas, no expliques y no agregues nada. Si no se entiende o no hay voz, devuelve una cadena vacía. Vocabulario probable: " +
            VOCABULARIO,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe este audio." },
            { type: "input_audio", input_audio: { data: base64, format: formato } },
          ],
        },
      ],
    }),
  });
  if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${await r.text().catch(() => "")}`);
  const datos = (await r.json()) as { choices?: { message?: { content?: string | { text?: string }[] } }[]; error?: { message?: string } };
  if (datos.error) throw new Error(`OpenRouter: ${datos.error.message}`);
  const c = datos.choices?.[0]?.message?.content;
  const texto = typeof c === "string" ? c : (c ?? []).map((x) => x.text ?? "").join("");
  return texto.trim().replace(/^["“«]+|["”»]+$/g, "");
}

export async function POST(req: Request) {
  const openai = process.env.OPENAI_API_KEY;
  const openrouter = process.env.OPENROUTER_API_KEY;
  if (!openai && !openrouter) {
    return Response.json({ error: "La transcripción de voz no está configurada (falta OPENROUTER_API_KEY u OPENAI_API_KEY)." }, { status: 503 });
  }
  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return Response.json({ error: "No llegó el audio." }, { status: 400 });
  if (audio.size > 4 * 1024 * 1024) return Response.json({ error: "La nota es muy larga (máx. ~1 minuto)." }, { status: 413 });
  const nombre = audio instanceof File && audio.name ? audio.name : "nota.webm";
  try {
    const texto = openai ? await conOpenAI(openai, audio, nombre) : await conOpenRouter(openrouter!, audio, nombre);
    return Response.json({ texto });
  } catch (e) {
    console.error("Error de transcripción", (e as Error).message.slice(0, 500));
    return Response.json({ error: "No se pudo transcribir la nota. Intenta de nuevo." }, { status: 502 });
  }
}
