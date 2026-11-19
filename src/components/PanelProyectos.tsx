"use client";
// Proyectos: varios trabajos guardados, agrupados por cliente.

import { useMemo, useState } from "react";
import { formatoDinero, proyectosAlDia, useEstado, type Proyecto } from "@/lib/estado";
import { calcularProyecto } from "@/lib/motor/proyecto";
import { hace } from "@/lib/cotizaciones";

export function PanelProyectos({ irADisenar }: { irADisenar: () => void }) {
  const estado = useEstado();
  const { proyectoId, config, precios, nuevoProyecto, abrirProyecto, borrarProyecto, duplicarProyecto } = estado;
  const [busca, setBusca] = useState("");
  const lista = proyectosAlDia(estado);

  const totales = useMemo(() => {
    const t: Record<string, number> = {};
    for (const p of lista) t[p.id] = p.items.length ? calcularProyecto(p.items, config, precios, p.cliente.transporte).total : 0;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista.map((p) => `${p.id}:${p.actualizado}:${p.items.length}`).join("|"), estado.items, config, precios]);

  const q = busca.trim().toLowerCase();
  const filtrados = q ? lista.filter((p) => `${p.cliente.cliente} ${p.cliente.proyecto} ${p.cliente.telefono}`.toLowerCase().includes(q)) : lista;

  // agrupar por cliente (nombre o WhatsApp); el grupo del proyecto abierto va primero
  const grupos = new Map<string, { nombre: string; telefono: string; proyectos: Proyecto[] }>();
  for (const p of filtrados) {
    const nombre = p.cliente.cliente.trim();
    const tel = p.cliente.telefono.replace(/\D/g, "");
    const k = tel || nombre.toLowerCase() || "~sin";
    const g = grupos.get(k) ?? { nombre: nombre || "Sin cliente", telefono: tel, proyectos: [] };
    g.proyectos.push(p);
    grupos.set(k, g);
  }
  const ordenados = [...grupos.values()].sort((a, b) => {
    const aa = a.proyectos.some((p) => p.id === proyectoId) ? 1 : 0;
    const bb = b.proyectos.some((p) => p.id === proyectoId) ? 1 : 0;
    return bb - aa || (b.proyectos[0]?.actualizado ?? "").localeCompare(a.proyectos[0]?.actualizado ?? "");
  });

  const abrir = (id: string) => {
    abrirProyecto(id);
    irADisenar();
  };

  return (
    <div className="panel panel-proyectos">
      <div className="cli-barra">
        <input type="search" placeholder="Buscar proyecto o cliente" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar proyecto" />
        <button
          className="btn"
          onClick={() => {
            nuevoProyecto();
            irADisenar();
          }}
        >
          + Proyecto
        </button>
      </div>

      {!lista.length ? (
        <div className="vacio">
          <p>
            Cada trabajo queda guardado como un proyecto: sus muebles, el cliente y la cotización. Así un cliente puede tener la cocina, el clóset y el
            mueble del baño por separado.
          </p>
        </div>
      ) : (
        ordenados.map((g) => (
          <section key={g.nombre + g.telefono} className="proy-grupo">
            <div className="proy-grupo-cab">
              <span className="cli-avatar" aria-hidden>
                {g.nombre.charAt(0).toUpperCase()}
              </span>
              <div>
                <b>{g.nombre}</b>
                <small>
                  {g.proyectos.length} proyecto{g.proyectos.length === 1 ? "" : "s"}
                  {g.telefono ? ` · ${g.telefono}` : ""}
                </small>
              </div>
              {g.nombre !== "Sin cliente" && (
                <button
                  className="btn-texto"
                  onClick={() => {
                    nuevoProyecto({ cliente: { cliente: g.nombre, telefono: g.telefono } });
                    irADisenar();
                  }}
                >
                  + Otro trabajo
                </button>
              )}
            </div>
            <ul className="proy-lista">
              {g.proyectos.map((p) => {
                const abierto = p.id === proyectoId;
                const muebles = p.items.reduce((s, i) => s + i.cantidad, 0);
                return (
                  <li key={p.id} className={`proy-item${abierto ? " abierto" : ""}`}>
                    <button className="proy-info" onClick={() => (abierto ? irADisenar() : abrir(p.id))}>
                      <b>{p.cliente.proyecto || "Proyecto sin nombre"}</b>
                      <small>
                        {muebles} mueble{muebles === 1 ? "" : "s"}
                        {totales[p.id] ? ` · ${formatoDinero(totales[p.id], precios)}` : ""} · {abierto ? "abierto ahora" : `editado ${hace(p.actualizado)}`}
                      </small>
                    </button>
                    <div className="proy-acciones">
                      {!abierto && (
                        <button className="btn-sec" onClick={() => abrir(p.id)}>
                          Abrir
                        </button>
                      )}
                      <button className="btn-texto" onClick={() => duplicarProyecto(p.id)}>
                        Duplicar
                      </button>
                      <button
                        className="hist-borrar"
                        onClick={() => {
                          if (confirm(`¿Borrar "${p.cliente.proyecto || "este proyecto"}"? No se puede deshacer.`)) borrarProyecto(p.id);
                        }}
                      >
                        Borrar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
