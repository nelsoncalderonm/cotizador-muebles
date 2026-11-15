import { interpretar, EJEMPLOS_VOZ, normalizar } from "../src/lib/voz/interpretar";
const casos = [...EJEMPLOS_VOZ,
 "Un aéreo de cocina de un metro veinte de ancho, setenta de alto, tres puertas",
 "escritorio de 1,40 x 75 x 60 con cajonera de tres cajones",
 "mesa de noche ancho 45 cm alto 55 dos cajones, son 2 iguales",
 "mueble bajo de cocina 60 de ancho con un cajón y dos puertas",
 "ropero de dos metros cuarenta de alto y metro y medio de ancho sin puertas",
];
for (const c of casos) { const r = interpretar(c, null); console.log("\n>", c, "\n ", normalizar(c), "\n ", r.muebleId, JSON.stringify(r.valores), r.cantidad ?? "", "|", r.entendido.join("; ")); }
for (const c of ["mueble de tv de 1 metro 80 con cajones a los lados", "mueble de baño de 60 de ancho flotante con 2 puertas", "despensa de 60 por 2 metros 10 con 2 puertas", "zapatero de 80 por 1 metro con 5 entrepaños"]) { const r = interpretar(c, null); console.log(c, "=>", r.muebleId, JSON.stringify(r.valores)); }
