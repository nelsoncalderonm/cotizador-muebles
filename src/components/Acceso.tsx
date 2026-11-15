"use client";
// Pantalla de entrada: correo y contraseña. Quien compró en Hotmart entra con el mismo correo de la compra.

import { useState } from "react";
import { EXIGIR_PAGO, useCuenta } from "@/lib/cuenta";
import { enlaceSoporte } from "@/lib/soporte";
import { supabase } from "@/lib/supabase";

const CHECKOUT = process.env.NEXT_PUBLIC_CHECKOUT_URL || "https://pay.hotmart.com/M108507757C";

const ERRORES: [RegExp, string][] = [
  [/invalid login/i, "El correo o la contraseña no coinciden."],
  [/already registered|already been registered/i, "Ese correo ya tiene cuenta. Entra con tu contraseña."],
  [/at least 6|password should/i, "La contraseña debe tener al menos 6 caracteres."],
  [/not confirmed/i, "Falta confirmar tu correo. Revisa tu bandeja de entrada."],
  [/rate limit|too many/i, "Demasiados intentos. Espera un momento y vuelve a probar."],
  [/valid email|invalid format/i, "Revisa que el correo esté bien escrito."],
];
const traducir = (m: string) => ERRORES.find(([r]) => r.test(m))?.[1] ?? "No pudimos entrar. Revisa tu conexión e inténtalo de nuevo.";

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="acceso">
      <div className="acceso-caja">
        <div className="acceso-marca">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/inner-logo-blanco.png" alt="INNER" />
          <b>Muebles</b>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Acceso() {
  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAviso("");
    setOcupado(true);
    const sb = supabase();
    const datos = { email: correo.trim().toLowerCase(), password: clave };
    try {
      if (modo === "entrar") {
        const { error } = await sb.auth.signInWithPassword(datos);
        if (error) setError(traducir(error.message));
      } else {
        const { data, error } = await sb.auth.signUp(datos);
        if (error) setError(traducir(error.message));
        else if (!data.session) setAviso("Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve a entrar.");
      }
    } catch {
      setError(traducir(""));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Marco>
      <h1>{modo === "entrar" ? "Entra a tu taller" : "Crea tu cuenta"}</h1>
      <p className="acceso-sub">{modo === "entrar" ? "Usa el correo con el que te suscribiste." : "Usa el mismo correo con el que pagaste tu suscripción."}</p>
      <form onSubmit={enviar}>
        <label className="campo">
          <span>Correo</span>
          <input type="email" inputMode="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="tucorreo@gmail.com" />
        </label>
        <label className="campo">
          <span>Contraseña</span>
          <input type="password" autoComplete={modo === "entrar" ? "current-password" : "new-password"} required minLength={6} value={clave} onChange={(e) => setClave(e.target.value)} placeholder="Mínimo 6 caracteres" />
        </label>
        {error && (
          <p className="acceso-error" role="alert">
            {error}
          </p>
        )}
        {aviso && (
          <p className="acceso-aviso" role="status">
            {aviso}
          </p>
        )}
        <button className="btn" disabled={ocupado} aria-busy={ocupado}>
          {ocupado ? "Un momento…" : modo === "entrar" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>
      <button
        className="acceso-cambio"
        onClick={() => {
          setModo(modo === "entrar" ? "crear" : "entrar");
          setError("");
          setAviso("");
        }}
      >
        {modo === "entrar" ? "Es mi primera vez: crear cuenta" : "Ya tengo cuenta: entrar"}
      </button>
      <a className="acceso-ayuda" href={enlaceSoporte("Hola, necesito ayuda para entrar a INNER Muebles.")} target="_blank" rel="noreferrer">
        ¿Olvidaste tu contraseña o no puedes entrar? Escríbenos
      </a>
    </Marco>
  );
}

/** Tiene cuenta pero su suscripción no está al día. */
export function SinSuscripcion() {
  const { correo, recargar, salir } = useCuenta();
  const [revisando, setRevisando] = useState(false);
  return (
    <Marco>
      <h1>Tu suscripción no está activa</h1>
      <p className="acceso-sub">
        No encontramos un pago al día para <b>{correo}</b>. Si pagaste con otro correo, entra con ese.
      </p>
      <a className="btn" href={CHECKOUT}>
        Suscribirme
      </a>
      <button
        className="btn-sec"
        disabled={revisando}
        onClick={async () => {
          setRevisando(true);
          await recargar().catch(() => {});
          setRevisando(false);
        }}
      >
        {revisando ? "Revisando…" : "Ya pagué, revisar de nuevo"}
      </button>
      <a className="acceso-ayuda" href={enlaceSoporte(`Hola, ya pagué INNER Muebles y no me deja entrar. Mi correo es ${correo ?? ""}.`)} target="_blank" rel="noreferrer">
        Pagué por Nequi o Bancolombia: avisar por WhatsApp
      </a>
      <button className="acceso-cambio" onClick={salir}>
        Entrar con otro correo
      </button>
    </Marco>
  );
}

/** Deja pasar a la app solo a quien corresponde. Sin cuentas configuradas, deja pasar a todos. */
export function Puerta({ children }: { children: React.ReactNode }) {
  const { activas, cargando, correo, cuenta } = useCuenta();
  if (!activas) return <>{children}</>;
  if (cargando) return <div className="cargando">Cargando…</div>;
  if (!correo) return <Acceso />;
  if (EXIGIR_PAGO && cuenta && !cuenta.con_acceso) return <SinSuscripcion />;
  return <>{children}</>;
}
