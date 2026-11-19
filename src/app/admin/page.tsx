"use client";
// Panel de dueños: quién está suscrito, cómo paga y cuánto usa la app.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Acceso } from "@/components/Acceso";
import { ProveedorCuenta, useCuenta } from "@/lib/cuenta";
import { supabase } from "@/lib/supabase";
import "./admin.css";

interface Cliente {
  correo: string;
  nombre: string | null;
  telefono: string | null;
  /** País del taller (id de PAISES), para armar el link de WhatsApp. */
  pais: string | null;
  taller: string | null;
  estado: string | null;
  plan: string | null;
  medio_pago: string | null;
  moneda: string | null;
  valor: number | null;
  origen: string | null;
  inicio: string | null;
  ultimo_pago: string | null;
  proximo_cobro: string | null;
  notas: string | null;
  registrado: string | null;
  ultimo_uso: string | null;
  segundos_uso: number;
  segundos_7d: number;
  dias_30d: number;
  es_dueno: boolean;
}

const MEDIOS: Record<string, string> = {
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta débito",
  PAYPAL: "PayPal",
  PSE: "PSE",
  NEQUI: "Nequi",
  BANCOLOMBIA: "Bancolombia",
  EFECTY: "Efecty",
  CASH_PAYMENT: "Efectivo",
  PIX: "Pix",
  BILLET: "Boleto",
  GOOGLE_PAY: "Google Pay",
  APPLE_PAY: "Apple Pay",
  WALLET: "Billetera",
};
const medio = (m: string | null) => (m ? MEDIOS[m.toUpperCase()] ?? m : "Sin dato");

// Indicativo por país del taller; si el número ya trae indicativo (más de 10 dígitos) se deja igual.
const INDICATIVOS: Record<string, string> = {
  co: "57", mx: "52", pe: "51", cl: "56", ar: "54", ec: "593", bo: "591", py: "595", uy: "598",
  ve: "58", gt: "502", cr: "506", do: "1", hn: "504", sv: "503", pa: "507",
};
function linkWhatsapp(tel: string, pais: string | null) {
  let d = tel.replace(/\D/g, "").replace(/^0+/, "");
  const ind = INDICATIVOS[pais ?? "co"];
  if (ind && d.length <= 10 && !d.startsWith(ind)) d = ind + d;
  return `https://wa.me/${d}`;
}

const fecha = (f: string | null) => (f ? new Date(f).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—");
function hace(f: string | null) {
  if (!f) return "Nunca";
  const min = Math.round((Date.now() - new Date(f).getTime()) / 60000);
  if (min < 2) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  if (min < 60 * 24) return `Hace ${Math.round(min / 60)} h`;
  const d = Math.round(min / 1440);
  return d === 1 ? "Ayer" : `Hace ${d} días`;
}
function tiempo(seg: number) {
  const min = Math.round(seg / 60);
  if (min < 1) return "0 min";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

type Vista = "activos" | "sin_pago" | "inactivos" | "todos";
const alDia = (c: Cliente) => c.estado === "activa" || (!!c.proximo_cobro && (c.estado === "atrasada" || c.estado === "cancelada") && new Date(c.proximo_cobro) > new Date());

function etiquetaEstado(c: Cliente): [string, string] {
  if (c.es_dueno) return ["Dueño", "dueno"];
  if (!c.estado) return ["Sin pago", "gris"];
  if (c.estado === "activa") return ["Activa", "ok"];
  if (c.estado === "atrasada") return ["Pago atrasado", "aviso"];
  if (c.estado === "reembolsada") return ["Reembolsada", "mal"];
  return [alDia(c) ? "Cancelada, aún con acceso" : "Cancelada", "mal"];
}

function Panel() {
  const { activas, correo, cuenta, cargando, salir } = useCuenta();
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [error, setError] = useState("");
  const [vista, setVista] = useState<Vista>("activos");
  const [buscar, setBuscar] = useState("");
  const [manual, setManual] = useState({ correo: "", nombre: "", medio: "Nequi", dias: 30 });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setError("");
    const { data, error } = await supabase().rpc("im_panel_clientes");
    if (error) setError("No se pudieron cargar los clientes.");
    else setClientes((data as Cliente[]) ?? []);
  }, []);
  useEffect(() => {
    if (cuenta?.es_dueno) cargar();
  }, [cuenta?.es_dueno, cargar]);

  const resumen = useMemo(() => {
    const lista = (clientes ?? []).filter((c) => !c.es_dueno);
    const activos = lista.filter(alDia);
    const semana = Date.now() - 7 * 864e5;
    const porMedio = new Map<string, number>();
    activos.forEach((c) => porMedio.set(medio(c.medio_pago), (porMedio.get(medio(c.medio_pago)) ?? 0) + 1));
    return {
      activos: activos.length,
      sinPago: lista.filter((c) => !c.estado).length,
      usanSemana: lista.filter((c) => c.ultimo_uso && new Date(c.ultimo_uso).getTime() > semana).length,
      sinEntrar: activos.filter((c) => !c.registrado).length,
      porMedio: [...porMedio.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [clientes]);

  if (!activas) return <div className="adm-centro">Las cuentas todavía no están configuradas.</div>;
  if (cargando) return <div className="adm-centro">Cargando…</div>;
  if (!correo) return <Acceso />;
  if (!cuenta?.es_dueno)
    return (
      <div className="adm-centro">
        <p>Este panel es solo para los dueños de INNER Muebles.</p>
        <a className="btn" href="/app">
          Ir a la app
        </a>
        <button className="btn-sec" onClick={salir}>
          Entrar con otro correo
        </button>
      </div>
    );

  const q = buscar.trim().toLowerCase();
  const visibles = (clientes ?? []).filter((c) => {
    if (q && !`${c.correo} ${c.nombre ?? ""} ${c.telefono ?? ""}`.toLowerCase().includes(q)) return false;
    if (vista === "activos") return alDia(c) && !c.es_dueno;
    if (vista === "sin_pago") return !c.estado && !c.es_dueno;
    if (vista === "inactivos") return !!c.estado && !alDia(c);
    return true;
  });

  async function activar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const { error } = await supabase().rpc("im_panel_activar", { p_correo: manual.correo, p_medio: manual.medio, p_dias: manual.dias, p_nombre: manual.nombre || null });
    setGuardando(false);
    if (error) return setError(error.message.includes("Correo") ? "Revisa el correo del cliente." : "No se pudo activar.");
    setManual({ ...manual, correo: "", nombre: "" });
    await cargar();
  }
  async function cancelar(c: Cliente) {
    if (!confirm(`¿Quitar el acceso a ${c.correo}?`)) return;
    const { error } = await supabase().rpc("im_panel_cancelar", { p_correo: c.correo });
    if (error) setError("No se pudo cancelar.");
    await cargar();
  }

  return (
    <div className="adm">
      <header className="adm-barra">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/inner-logo-blanco.png" alt="INNER" />
          <b>Panel de dueños</b>
        </div>
        <nav>
          <a href="/app">Ir a la app</a>
          <button onClick={salir}>Salir</button>
        </nav>
      </header>
      <main className="adm-cuerpo">
        <section className="adm-cifras">
          <div>
            <small>Suscritos al día</small>
            <strong>{resumen.activos}</strong>
          </div>
          <div>
            <small>Usaron la app esta semana</small>
            <strong>{resumen.usanSemana}</strong>
          </div>
          <div>
            <small>Pagaron y no han entrado</small>
            <strong>{resumen.sinEntrar}</strong>
          </div>
          <div>
            <small>Registrados sin pago</small>
            <strong>{resumen.sinPago}</strong>
          </div>
        </section>
        {resumen.porMedio.length > 0 && (
          <p className="adm-medios">
            <b>Cómo pagan:</b> {resumen.porMedio.map(([m, n]) => `${m} ${n}`).join(" · ")}
          </p>
        )}
        {error && (
          <p className="adm-error" role="alert">
            {error}
          </p>
        )}

        <div className="adm-filtros">
          <div className="segmentos">
            {(
              [
                ["activos", "Al día"],
                ["sin_pago", "Sin pago"],
                ["inactivos", "Cancelados"],
                ["todos", "Todos"],
              ] as [Vista, string][]
            ).map(([v, t]) => (
              <button key={v} className={vista === v ? "activo" : ""} onClick={() => setVista(v)}>
                {t}
              </button>
            ))}
          </div>
          <input type="search" placeholder="Buscar por correo o nombre" value={buscar} onChange={(e) => setBuscar(e.target.value)} aria-label="Buscar cliente" />
          <button className="btn-sec" onClick={cargar}>
            Actualizar
          </button>
        </div>

        {clientes === null ? (
          <p className="adm-vacio">Cargando clientes…</p>
        ) : visibles.length === 0 ? (
          <p className="adm-vacio">No hay clientes en esta lista todavía.</p>
        ) : (
          <div className="adm-tabla" role="table" aria-label="Clientes">
            <div className="adm-fila adm-cab" role="row">
              <span>Cliente</span>
              <span>Estado</span>
              <span>Modo de pago</span>
              <span>Próximo cobro</span>
              <span>Tiempo en la app</span>
              <span>Último uso</span>
              <span />
            </div>
            {visibles.map((c) => {
              const [texto, tono] = etiquetaEstado(c);
              return (
                <div key={c.correo} className="adm-fila" role="row">
                  <span className="adm-cliente">
                    <b>{c.nombre || c.correo}</b>
                    {c.nombre && <small>{c.correo}</small>}
                    {c.taller && <small>{c.taller}</small>}
                    {c.telefono && (
                      <small>
                        <a href={linkWhatsapp(c.telefono, c.pais)} target="_blank" rel="noreferrer">
                          WhatsApp {c.telefono}
                        </a>
                      </small>
                    )}
                    <small>Desde {fecha(c.inicio ?? c.registrado)}</small>
                  </span>
                  <span data-t="Estado">
                    <i className={`adm-chip ${tono}`}>{texto}</i>
                  </span>
                  <span data-t="Modo de pago">
                    {medio(c.medio_pago)}
                    {c.origen === "manual" && <small>Activado a mano</small>}
                    {c.valor != null && (
                      <small>
                        {c.moneda} {c.valor}
                      </small>
                    )}
                  </span>
                  <span data-t="Próximo cobro">{fecha(c.proximo_cobro)}</span>
                  <span data-t="Tiempo en la app">
                    {c.registrado ? tiempo(c.segundos_uso) : "No ha entrado"}
                    {c.registrado && (
                      <small>
                        {tiempo(c.segundos_7d)} esta semana · {c.dias_30d} {c.dias_30d === 1 ? "día" : "días"} del mes
                      </small>
                    )}
                  </span>
                  <span data-t="Último uso">{c.registrado ? hace(c.ultimo_uso) : "—"}</span>
                  <span className="adm-acciones">
                    {!c.es_dueno && !alDia(c) && (
                      <button className="btn-sec" onClick={() => setManual({ ...manual, correo: c.correo, nombre: c.nombre ?? "" })}>
                        Activar
                      </button>
                    )}
                    {!c.es_dueno && alDia(c) && c.origen === "manual" && (
                      <button className="btn-peligro" onClick={() => cancelar(c)}>
                        Quitar acceso
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <section className="adm-manual">
          <h2>Activar un pago por transferencia</h2>
          <p>Para quien pagó por Nequi o Bancolombia y mandó el comprobante. Si ya estaba activo, se le suman los días.</p>
          <form onSubmit={activar}>
            <label>
              <span>Correo del cliente</span>
              <input type="email" required value={manual.correo} onChange={(e) => setManual({ ...manual, correo: e.target.value })} />
            </label>
            <label>
              <span>Nombre</span>
              <input value={manual.nombre} onChange={(e) => setManual({ ...manual, nombre: e.target.value })} />
            </label>
            <label>
              <span>Pagó por</span>
              <select value={manual.medio} onChange={(e) => setManual({ ...manual, medio: e.target.value })}>
                <option>Nequi</option>
                <option>Bancolombia</option>
                <option>Efectivo</option>
                <option>Cortesía</option>
              </select>
            </label>
            <label>
              <span>Días de acceso</span>
              <input type="number" min={1} max={400} value={manual.dias} onChange={(e) => setManual({ ...manual, dias: Number(e.target.value) || 30 })} />
            </label>
            <button className="btn" disabled={guardando}>
              {guardando ? "Guardando…" : "Activar acceso"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default function Admin() {
  return (
    <ProveedorCuenta>
      <Panel />
    </ProveedorCuenta>
  );
}
