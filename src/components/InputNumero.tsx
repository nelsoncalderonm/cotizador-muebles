"use client";

import { useState } from "react";

const formato = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

/** Campo de dinero que muestra los miles separados con punto (230.000) y deja escribir con normalidad. */
export function InputNumero({ valor, onCambio, vacioSiCero, placeholder }: { valor: number; onCambio: (n: number) => void; vacioSiCero?: boolean; placeholder?: string }) {
  const [texto, setTexto] = useState<string | null>(null);
  const mostrado = texto ?? (vacioSiCero && !valor ? "" : formato.format(valor));
  return (
    <input
      type="text"
      inputMode="decimal"
      value={mostrado}
      placeholder={placeholder}
      onFocus={(e) => {
        setTexto(mostrado);
        e.target.select();
      }}
      onChange={(e) => {
        // en dinero el punto siempre separa miles y la coma separa decimales
        const crudo = e.target.value.replace(/[^\d.,]/g, "");
        const [ent, ...resto] = crudo.split(",");
        const digitos = ent.replace(/\D/g, "");
        const dec = resto.join("").replace(/\D/g, "").slice(0, 2);
        const mostrar = (digitos ? formato.format(Number(digitos)) : "") + (crudo.includes(",") ? `,${dec}` : "");
        setTexto(mostrar);
        onCambio(Number(digitos || 0) + (dec ? Number(`0.${dec}`) : 0));
      }}
      onBlur={() => setTexto(null)}
    />
  );
}
