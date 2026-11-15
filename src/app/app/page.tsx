"use client";

import { useCallback, useEffect, useState } from "react";
import { ProveedorEstado, formatoDinero, useEstado } from "@/lib/estado";
import { PanelDisenar } from "@/components/PanelDisenar";
import { PanelArmado, PanelCortes, PanelCotizar, PanelLaminas } from "@/components/PanelesResultado";
import { PanelPrecios } from "@/components/PanelPrecios";
import { Onboarding } from "@/components/Onboarding";
import { Puerta } from "@/components/Acceso";
import { ProveedorCuenta } from "@/lib/cuenta";

const PESTANAS = [
  { id: "disenar", etiqueta: "Diseñar", icono: "M4 20h16M6 16V8l6-4 6 4v8M10 16v-4h4v4" },
  { id: "cortes", etiqueta: "Cortes", icono: "M4 6h16M4 12h16M4 18h10" },
  { id: "laminas", etiqueta: "Láminas", icono: "M3 5h18v14H3zM11 5v14M11 11h10" },
  { id: "armado", etiqueta: "Armado", icono: "M5 19V5h14v14zM5 12h14M12 5v7" },
  { id: "cotizar", etiqueta: "Cotizar", icono: "M7 3h10v18l-5-3-5 3zM10 8h4M10 12h4" },
] as const;

type Id = (typeof PESTANAS)[number]["id"] | "precios";
const IDS: Id[] = [...PESTANAS.map((p) => p.id), "precios"];

function App() {
  const { listo, resultado, precios, items, nuevoProyecto, configurado } = useEstado();
  const [tab, setTabEstado] = useState<Id>("disenar");
  // La pestaña vive en la URL (#cortes, #cotizar…): el botón Atrás del celular vuelve a la pestaña anterior
  useEffect(() => {
    const leer = () => {
      const h = location.hash.slice(1);
      setTabEstado(IDS.includes(h as Id) ? (h as Id) : "disenar");
    };
    leer();
    window.addEventListener("hashchange", leer);
    return () => window.removeEventListener("hashchange", leer);
  }, []);
  const setTab = useCallback((t: Id) => {
    setTabEstado(t);
    if (location.hash.slice(1) !== t) history.pushState(null, "", `#${t}`);
    window.scrollTo({ top: 0 });
  }, []);
  if (!listo) return <div className="cargando">Cargando…</div>;
  return (
    <div className="app">
      {!configurado && <Onboarding />}
      <header className="barra">
        <div className="marca">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/inner-logo-blanco.png" alt="INNER" />
          <i aria-hidden />
          <b>Muebles</b>
          <h1 className="solo-lector">INNER Muebles</h1>
        </div>
        <div className="barra-acciones">
          {items.length > 0 && (
            <button
              className="btn-icono"
              onClick={() => {
                if (confirm("¿Empezar un proyecto nuevo? Se borran los muebles actuales.")) nuevoProyecto();
              }}
            >
              Nuevo
            </button>
          )}
          <button className={`btn-icono${tab === "precios" ? " activo" : ""}`} aria-pressed={tab === "precios"} onClick={() => setTab(tab === "precios" ? "disenar" : "precios")}>
            Mis precios
          </button>
        </div>
      </header>

      <nav className="pestanas" aria-label="Secciones">
        {PESTANAS.map((p) => (
          <button key={p.id} className={tab === p.id ? "activo" : ""} aria-current={tab === p.id ? "page" : undefined} onClick={() => setTab(p.id)}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d={p.icono} />
            </svg>
            <span>{p.etiqueta}</span>
          </button>
        ))}
      </nav>

      <main className="contenido">
        {tab === "disenar" && <PanelDisenar />}
        {tab === "cortes" && <PanelCortes />}
        {tab === "laminas" && <PanelLaminas />}
        {tab === "armado" && <PanelArmado />}
        {tab === "cotizar" && <PanelCotizar />}
        {tab === "precios" && <PanelPrecios />}
      </main>

      {items.length > 0 && tab !== "cotizar" && (
        <button className="total-flotante" onClick={() => setTab("cotizar")}>
          <span>
            {resultado.materiales.reduce((s, m) => s + m.laminas.length, 0)} láminas · {items.reduce((s, i) => s + i.cantidad, 0)} mueble(s)
          </span>
          <strong>{formatoDinero(resultado.total, precios)}</strong>
        </button>
      )}
    </div>
  );
}

export default function Pagina() {
  return (
    <ProveedorCuenta>
      <Puerta>
        <ProveedorEstado>
          <App />
        </ProveedorEstado>
      </Puerta>
    </ProveedorCuenta>
  );
}
