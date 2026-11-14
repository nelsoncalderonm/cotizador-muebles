# INNER Muebles

App web para carpinteros que fabrican en melamina: diseñan muebles con medidas reales y obtienen al instante la lista de cortes, las láminas optimizadas, los herrajes, la cotización con sus propios precios, los planos de armado paso a paso y los PDF listos para el cliente y para el proveedor que corta.

Los muebles **no son imágenes**: cada uno es una función en código (`src/lib/motor/catalogo.ts`) que convierte medidas en piezas. El cálculo es 100 % determinista. La única IA es la transcripción de notas de voz.

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | Landing de venta (respuesta directa) con botón al checkout de Hotmart |
| `/app` | La aplicación (funciona en celular y computador) |
| `/api/voz` | Transcribe notas de voz con OpenAI |

## Estructura

- `src/lib/motor/` motor de cálculo puro (sin React): catálogo paramétrico, optimizador de láminas (MaxRects con sierra y refilado), cálculo de proyecto y cotización.
- `src/lib/voz/interpretar.ts` convierte el texto dictado ("bajo de cocina de 80 de ancho con dos puertas") en valores del formulario, con reglas en español.
- `src/lib/pdf.ts` genera los PDF con jsPDF: orden de corte para el proveedor, cotización y planos.
- `src/components/` interfaz.

### Agregar un mueble al catálogo

Crea una `DefinicionMueble` en `catalogo.ts` con sus `parametros` y una función `generar` que use `Constructor` (`caja`, `entrepanos`, `puertas`, `cajones`, `pieza`, `herraje`, `paso`). Agrégala a `CATALOGO` y aparece en la app, en los PDF y en la voz (añade su palabra clave en `MUEBLES` de `interpretar.ts`).

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y completa las claves
npm run dev                  # http://localhost:3000
npm run prueba               # pruebas rápidas del motor y del intérprete de voz
```

## Despliegue en Vercel

1. Importa este repo en Vercel (framework Next.js, sin cambios).
2. Variables de entorno: `NEXT_PUBLIC_CHECKOUT_URL` (link de pago de Hotmart), `OPENAI_API_KEY`.

## Pendiente (siguiente fase)

- Cuentas con Supabase y activación de la suscripción con el webhook de Hotmart (hoy los datos se guardan en el dispositivo).
- Proteger `/api/voz` para que solo lo usen suscriptores.
- Renders con IA pagados con créditos prepagados.
