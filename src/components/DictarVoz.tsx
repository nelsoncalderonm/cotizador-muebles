"use client";

import { useEffect, useRef, useState } from "react";
import { useEstado } from "@/lib/estado";
import { buscarMueble } from "@/lib/motor/catalogo";
import { EJEMPLOS_VOZ, interpretar, type Interpretacion } from "@/lib/voz/interpretar";

type Fase = "listo" | "grabando" | "procesando" | "revisar";

function tipoAudio() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) if (MediaRecorder.isTypeSupported(t)) return t;
  return "";
}

/** Botón para dictar un mueble por voz: graba, transcribe y llena el formulario. */
export function DictarVoz() {
  const { items, seleccion, agregar, actualizarItem } = useEstado();
  const [fase, setFase] = useState<Fase>("listo");
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [segundos, setSegundos] = useState(0);
  const grabador = useRef<MediaRecorder | null>(null);
  const trozos = useRef<Blob[]>([]);
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null);

  const actual = items.find((i) => i.uid === seleccion) ?? null;
  const inter: Interpretacion | null = texto ? interpretar(texto, actual?.muebleId ?? null) : null;

  useEffect(() => () => {
    if (reloj.current) clearInterval(reloj.current);
    grabador.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  async function empezar() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = tipoAudio();
      const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      trozos.current = [];
      rec.ondataavailable = (e) => e.data.size && trozos.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void enviar(new Blob(trozos.current, { type: rec.mimeType || "audio/webm" }));
      };
      rec.start();
      grabador.current = rec;
      setSegundos(0);
      setFase("grabando");
      reloj.current = setInterval(() => {
        setSegundos((s) => {
          if (s + 1 >= 60) detener();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("No se pudo usar el micrófono. Revisa el permiso del navegador o escribe abajo.");
      setFase("revisar");
    }
  }

  function detener() {
    if (reloj.current) clearInterval(reloj.current);
    reloj.current = null;
    if (grabador.current?.state === "recording") grabador.current.stop();
  }

  async function enviar(audio: Blob) {
    setFase("procesando");
    try {
      const ext = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
      const fd = new FormData();
      fd.append("audio", audio, `nota.${ext}`);
      const r = await fetch("/api/voz", { method: "POST", body: fd });
      const d = (await r.json()) as { texto?: string; error?: string };
      if (!r.ok) throw new Error(d.error || "Error al transcribir");
      setTexto(d.texto ?? "");
      setFase("revisar");
    } catch (e) {
      setError((e as Error).message);
      setFase("revisar");
    }
  }

  function aplicar() {
    if (!inter) return;
    const destinoId = inter.muebleId ?? actual?.muebleId;
    if (!destinoId) {
      setError("No entendí qué mueble es. Di por ejemplo: \"librero\", \"closet\" o \"bajo de cocina\".");
      return;
    }
    if (actual && (!inter.muebleId || inter.muebleId === actual.muebleId)) {
      actualizarItem(actual.uid, { valores: { ...actual.valores, ...inter.valores }, ...(inter.cantidad ? { cantidad: inter.cantidad } : {}) });
    } else {
      agregar(destinoId, inter.valores, inter.cantidad);
    }
    cerrar();
  }

  function cerrar() {
    setFase("listo");
    setTexto("");
    setError("");
  }

  if (fase === "listo")
    return (
      <div className="voz">
        <button className="btn-voz" onClick={empezar}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
          Dictar mueble por voz
        </button>
        <button className="btn-texto" onClick={() => setFase("revisar")}>
          o escribir
        </button>
      </div>
    );

  return (
    <div className="voz-panel" role="dialog" aria-label="Dictar mueble">
      {fase === "grabando" && (
        <div className="voz-grabando">
          <span className="pulso" aria-hidden />
          <p>
            Escuchando… <b>{segundos}s</b>
          </p>
          <p className="nota">Ej.: “{EJEMPLOS_VOZ[0]}”</p>
          <button className="btn" onClick={detener}>
            Listo, procesar
          </button>
        </div>
      )}
      {fase === "procesando" && <p className="nota">Transcribiendo la nota…</p>}
      {fase === "revisar" && (
        <>
          <label className="campo">
            <span>Lo que dijiste (puedes corregirlo)</span>
            <textarea rows={3} value={texto} placeholder={EJEMPLOS_VOZ[1]} onChange={(e) => setTexto(e.target.value)} />
          </label>
          {error && <p className="avisos">{error}</p>}
          {inter && (
            <div className="entendido">
              <b>Entendí:</b>
              {inter.entendido.length ? (
                <ul>
                  {!inter.muebleId && actual && <li>Cambios en {actual.nombre}</li>}
                  {inter.muebleId && actual && inter.muebleId !== actual.muebleId && <li>Nuevo mueble: {buscarMueble(inter.muebleId)?.nombre}</li>}
                  {inter.entendido.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              ) : (
                <p className="nota">Nada todavía. Menciona el mueble y medidas como “80 de ancho”.</p>
              )}
            </div>
          )}
          <div className="acciones">
            <button className="btn-sec" onClick={cerrar}>
              Cancelar
            </button>
            <button className="btn-sec" onClick={empezar}>
              Grabar otra vez
            </button>
            <button className="btn" disabled={!inter || inter.entendido.length === 0} onClick={aplicar}>
              Aplicar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
