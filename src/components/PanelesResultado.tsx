"use client";

import { useState } from "react";
import { formatoDinero, mm, useEstado } from "@/lib/estado";
import { textoCantos } from "@/lib/motor/proyecto";
import { LaminaSvg } from "./LaminaSvg";
import { VistaMueble } from "./VistaMueble";
import { colorMueble } from "@/lib/colores";

function Vacio() {
  return <p className="vacio">Agrega al menos un mueble en la pestaña Diseñar.</p>;
}

export function BotonPdf({ etiqueta, generar, principal }: { etiqueta: string; generar: () => Promise<void>; principal?: boolean }) {
  const [ocupado, setOcupado] = useState(false);
  return (
    <button
      className={principal ? "btn" : "btn-sec"}
      disabled={ocupado}
      onClick={async () => {
        setOcupado(true);
        try {
          await generar();
        } finally {
          setOcupado(false);
        }
      }}
    >
      {ocupado ? "Generando…" : etiqueta}
    </button>
  );
}

function nombreArchivo(base: string, proyecto: string) {
  const limpio = (proyecto || "proyecto").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  return `${base}-${limpio}.pdf`;
}

export function useAccionesPdf() {
  const { resultado, config, taller, cliente, precios } = useEstado();
  return {
    proveedor: async () => {
      const { pdfProveedor, compartirPdf } = await import("@/lib/pdf");
      await compartirPdf(pdfProveedor(resultado, config, taller, cliente), nombreArchivo("orden-de-corte", cliente.proyecto));
    },
    planos: async () => {
      const { pdfPlanos, compartirPdf } = await import("@/lib/pdf");
      await compartirPdf(pdfPlanos(resultado, taller, cliente), nombreArchivo("planos", cliente.proyecto));
    },
    cotizacion: async (detallado: boolean) => {
      const { pdfCotizacion, compartirPdf } = await import("@/lib/pdf");
      await compartirPdf(pdfCotizacion(resultado, precios, taller, cliente, detallado), nombreArchivo("cotizacion", cliente.proyecto));
    },
  };
}

export function PanelCortes() {
  const { resultado, config } = useEstado();
  const pdf = useAccionesPdf();
  if (!resultado.cortes.length) return <Vacio />;
  return (
    <div className="panel">
      <div className="panel-cab">
        <h2>Lista de cortes</h2>
        <BotonPdf principal etiqueta="PDF para el proveedor" generar={pdf.proveedor} />
      </div>
      <p className="nota">
        Medidas de corte en mm, ya descontando {config.espesorCanto} mm de canto por arista. Total de canto: <b>{mm(resultado.metrosCanto)} m</b>.
      </p>
      {resultado.materiales
        .filter((m) => resultado.cortes.some((f) => f.material === m.clave))
        .map((m) => (
          <section key={m.clave} className="bloque">
            <h3>{m.nombre}</h3>
            <div className="tabla-cortes">
              <div className="fila cab">
                <span>Cód.</span>
                <span>Pieza</span>
                <span className="num">Largo</span>
                <span className="num">Ancho</span>
                <span className="num">Cant.</span>
                <span>Canto</span>
              </div>
              {resultado.cortes
                .filter((f) => f.material === m.clave)
                .map((f) => (
                  <div className="fila" key={f.codigo}>
                    <span>
                      <i className="punto" style={{ background: colorMueble(f.codigo) }} />
                      {f.codigo}
                    </span>
                    <span>
                      {f.pieza}
                      <small>{f.mueble}</small>
                    </span>
                    <span className="num fuerte">{mm(f.largoCorte)}</span>
                    <span className="num fuerte">{mm(f.anchoCorte)}</span>
                    <span className="num">{f.cantidad}</span>
                    <span className="cantos">{textoCantos(f.cantos)}</span>
                  </div>
                ))}
            </div>
          </section>
        ))}
      <section className="bloque">
        <h3>Herrajes</h3>
        <ul className="lista-herrajes">
          {resultado.herrajes.map((h) => (
            <li key={h.clave}>
              <b>
                {mm(h.cantidad)} {h.unidad}
              </b>{" "}
              {h.nombre}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function PanelLaminas() {
  const { resultado, config } = useEstado();
  const pdf = useAccionesPdf();
  if (!resultado.cortes.length) return <Vacio />;
  return (
    <div className="panel">
      <div className="panel-cab">
        <h2>Optimización de láminas</h2>
        <BotonPdf principal etiqueta="PDF para el proveedor" generar={pdf.proveedor} />
      </div>
      <p className="nota">
        Sierra {config.sierra} mm · refilado {config.refilado} mm. Los números son el código de cada pieza en la lista de cortes.
      </p>
      {resultado.advertencias
        .filter((a) => a.includes("no cabe"))
        .map((a, i) => (
          <p key={i} className="avisos">
            {a}
          </p>
        ))}
      {resultado.materiales
        .filter((m) => m.laminas.length)
        .map((m) => (
          <section key={m.clave} className="bloque">
            <h3>
              {m.nombre}: {m.laminas.length} lámina{m.laminas.length > 1 ? "s" : ""}
            </h3>
            {m.laminas.map((l) => (
              <figure key={l.numero} className="lamina">
                <figcaption>
                  Lámina {l.numero} · {l.piezas.length} piezas · <b>{Math.round(l.aprovechamiento * 100)} %</b> aprovechado
                </figcaption>
                <LaminaSvg lamina={l} />
              </figure>
            ))}
          </section>
        ))}
    </div>
  );
}

export function PanelArmado() {
  const { resultado } = useEstado();
  const pdf = useAccionesPdf();
  const [sel, setSel] = useState(0);
  const [paso, setPaso] = useState(0);
  if (!resultado.muebles.length) return <Vacio />;
  const m = resultado.muebles[Math.min(sel, resultado.muebles.length - 1)];
  const pasos = m.resultado.pasos;
  const p = Math.min(paso, pasos.length - 1);
  const conocidas = new Set(pasos.flatMap((x) => x.piezas));
  const visibles = new Set(pasos.slice(0, p + 1).flatMap((x) => x.piezas));
  const resaltar = new Set(pasos[p]?.piezas ?? []);
  const conFrentes = pasos.slice(0, p + 1).some((x) => x.piezas.some((id) => id === "puerta" || id.endsWith("_frente")));
  return (
    <div className="panel">
      <div className="panel-cab">
        <h2>Planos y armado</h2>
        <BotonPdf principal etiqueta="PDF de planos" generar={pdf.planos} />
      </div>
      <div className="chips">
        {resultado.muebles.map((x, i) => (
          <button
            key={x.item.uid}
            className={`chip${i === sel ? " activo" : ""}`}
            onClick={() => {
              setSel(i);
              setPaso(0);
            }}
          >
            {x.item.nombre}
          </button>
        ))}
      </div>
      <div className="editor">
        <div className="editor-vista">
          <VistaMueble vista={m.resultado.vista} visibles={visibles} conocidas={conocidas} resaltar={resaltar} frentes={conFrentes} />
        </div>
        <div className="editor-form">
          <ol className="pasos">
            {pasos.map((x, i) => (
              <li key={i} className={i === p ? "activo" : i < p ? "hecho" : ""} onClick={() => setPaso(i)}>
                <b>{x.titulo}</b>
                {i === p && <p>{x.descripcion}</p>}
              </li>
            ))}
          </ol>
          <div className="acciones">
            <button className="btn-sec" disabled={p === 0} onClick={() => setPaso(p - 1)}>
              ← Anterior
            </button>
            <button className="btn" disabled={p >= pasos.length - 1} onClick={() => setPaso(p + 1)}>
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PanelCotizar() {
  const { resultado, precios, cliente, setCliente, taller } = useEstado();
  const pdf = useAccionesPdf();
  const [detallado, setDetallado] = useState(false);
  if (!resultado.muebles.length) return <Vacio />;
  const $ = (n: number) => formatoDinero(n, precios);
  const texto = encodeURIComponent(
    [
      `*Cotización${cliente.proyecto ? `: ${cliente.proyecto}` : ""}*`,
      ...resultado.muebles.map((m) => `• ${m.item.cantidad} × ${m.item.nombre} (${mm(m.resultado.vista.ancho)}×${mm(m.resultado.vista.alto)} mm)`),
      `*Total: ${$(resultado.total)}*`,
      `Válida por ${cliente.validezDias} días.`,
      taller.nombre ? `— ${taller.nombre}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const tel = cliente.telefono.replace(/\D/g, "");
  return (
    <div className="panel">
      <div className="panel-cab">
        <h2>Cotización</h2>
      </div>
      <div className="grid-campos">
        <label className="campo">
          <span>Proyecto</span>
          <input value={cliente.proyecto} placeholder="Cocina Sra. Martínez" onChange={(e) => setCliente({ ...cliente, proyecto: e.target.value })} />
        </label>
        <label className="campo">
          <span>Cliente</span>
          <input value={cliente.cliente} onChange={(e) => setCliente({ ...cliente, cliente: e.target.value })} />
        </label>
        <label className="campo">
          <span>WhatsApp del cliente</span>
          <input type="tel" inputMode="tel" value={cliente.telefono} placeholder="573001234567" onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })} />
        </label>
        <label className="campo">
          <span>Validez (días)</span>
          <input type="number" inputMode="numeric" value={cliente.validezDias} onChange={(e) => setCliente({ ...cliente, validezDias: Number(e.target.value) || 0 })} />
        </label>
      </div>
      <label className="campo">
        <span>Notas para el cliente</span>
        <textarea rows={2} value={cliente.notas} placeholder="Incluye instalación. 50 % de anticipo." onChange={(e) => setCliente({ ...cliente, notas: e.target.value })} />
      </label>

      <section className="bloque">
        <h3>Costos</h3>
        <div className="tabla-costos">
          {resultado.costos.map((c, i) => (
            <div key={i} className="fila">
              <span>
                {c.concepto}
                <small>
                  {mm(c.cantidad)} × {$(c.unitario)}
                </small>
              </span>
              <span className="num">{$(c.total)}</span>
            </div>
          ))}
          <div className="fila sub">
            <span>Materiales y herrajes</span>
            <span className="num">{$(resultado.subtotalMateriales)}</span>
          </div>
          <div className="fila">
            <span>Mano de obra ({precios.manoObraPorcentaje} %)</span>
            <span className="num">{$(resultado.manoObra)}</span>
          </div>
          {resultado.otrosCostos > 0 && (
            <div className="fila">
              <span>Otros costos</span>
              <span className="num">{$(resultado.otrosCostos)}</span>
            </div>
          )}
          <div className="fila">
            <span>Utilidad ({precios.margenPorcentaje} %)</span>
            <span className="num">{$(resultado.utilidad)}</span>
          </div>
          {resultado.impuesto > 0 && (
            <div className="fila">
              <span>Impuesto ({precios.impuestoPorcentaje} %)</span>
              <span className="num">{$(resultado.impuesto)}</span>
            </div>
          )}
          <div className="fila total">
            <span>Precio al cliente</span>
            <span className="num">{$(resultado.total)}</span>
          </div>
        </div>
      </section>

      <label className="campo campo-switch">
        <span>Mostrar desglose de costos al cliente</span>
        <input type="checkbox" checked={detallado} onChange={(e) => setDetallado(e.target.checked)} />
        <i aria-hidden />
      </label>
      <div className="acciones apiladas">
        <BotonPdf principal etiqueta="PDF de cotización para el cliente" generar={() => pdf.cotizacion(detallado)} />
        <a className="btn-wa" href={`https://wa.me/${tel}?text=${texto}`} target="_blank" rel="noreferrer">
          Enviar resumen por WhatsApp
        </a>
        <BotonPdf etiqueta="PDF de cortes para el proveedor" generar={pdf.proveedor} />
        <BotonPdf etiqueta="PDF de planos de armado" generar={pdf.planos} />
      </div>
    </div>
  );
}
