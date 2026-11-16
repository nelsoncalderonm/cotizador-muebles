"use client";
// Sesión del carpintero, estado de su suscripción y registro del tiempo de uso.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cuentasActivas, supabase } from "./supabase";

export interface MiCuenta {
  correo: string;
  es_dueno: boolean;
  estado: string | null;
  medio_pago: string | null;
  proximo_cobro: string | null;
  con_acceso: boolean;
}

interface Ctx {
  /** false cuando la app no tiene cuentas configuradas (funciona abierta). */
  activas: boolean;
  cargando: boolean;
  correo: string | null;
  cuenta: MiCuenta | null;
  recargar: () => Promise<void>;
  salir: () => Promise<void>;
}

const Contexto = createContext<Ctx>({ activas: false, cargando: false, correo: null, cuenta: null, recargar: async () => {}, salir: async () => {} });
export const useCuenta = () => useContext(Contexto);

/** Si es "si", solo entra quien tiene la suscripción al día. */
export const EXIGIR_PAGO = process.env.NEXT_PUBLIC_EXIGIR_SUSCRIPCION === "si";

export function ProveedorCuenta({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(cuentasActivas);
  const [correo, setCorreo] = useState<string | null>(null);
  const [cuenta, setCuenta] = useState<MiCuenta | null>(null);

  const recargar = useCallback(async () => {
    const { data } = await supabase().rpc("im_mi_cuenta");
    setCuenta((data as MiCuenta) ?? null);
  }, []);

  useEffect(() => {
    if (!cuentasActivas) return;
    const sb = supabase();
    let vivo = true;
    const aplicar = async (c: string | null) => {
      if (!vivo) return;
      setCorreo(c);
      if (c) await recargar().catch(() => {});
      else setCuenta(null);
      if (vivo) setCargando(false);
    };
    sb.auth.getSession().then(({ data }) => aplicar(data.session?.user.email ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      // fuera del callback de auth para no bloquear el cliente
      setTimeout(() => aplicar(s?.user.email ?? null), 0);
    });
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [recargar]);

  // Tiempo en la app: un latido por minuto mientras la pestaña está visible y hubo actividad reciente
  const ultimaActividad = useRef(0);
  useEffect(() => {
    if (!cuentasActivas || !correo) return;
    const marcar = () => (ultimaActividad.current = Date.now());
    marcar();
    const eventos = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    eventos.forEach((e) => window.addEventListener(e, marcar, { passive: true }));
    const reloj = setInterval(() => {
      if (document.visibilityState !== "visible" || Date.now() - ultimaActividad.current > 150_000) return;
      supabase().rpc("im_registrar_uso", { segundos: 60 }).then(
        () => {},
        () => {},
      );
    }, 60_000);
    return () => {
      clearInterval(reloj);
      eventos.forEach((e) => window.removeEventListener(e, marcar));
    };
  }, [correo]);

  const salir = useCallback(async () => {
    await supabase().auth.signOut();
  }, []);

  return <Contexto.Provider value={{ activas: cuentasActivas, cargando, correo, cuenta, recargar, salir }}>{children}</Contexto.Provider>;
}
