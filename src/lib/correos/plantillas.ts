// Textos de los correos semanales de INNER Muebles. Cada correo: corto, un solo botón, tono de parcero.

export const URL_APP = "https://muebles.innergrowth.pro/app";
export const GRUPO_WHATSAPP = "https://chat.whatsapp.com/L689l2hDecdJzzLTcUL9p5";

export type Correo = {
  asunto: string;
  /** Texto corto que se ve junto al asunto en la bandeja */
  previa: string;
  /** Párrafos. {nombre} se cambia por el primer nombre (o "parcero"). */
  parrafos: string[];
  boton: { texto: string; url: string };
  /** Línea opcional después del botón */
  posdata?: string;
};

export const BIENVENIDA: Correo = {
  asunto: "Bienvenido a INNER Muebles, {nombre} 🪚",
  previa: "Tu primera cotización en 5 minutos. Así se entra.",
  parrafos: [
    "¡Qué bueno tenerte aquí, {nombre}!",
    "Para entrar a la app, crea tu cuenta con el mismo correo con el que pagaste y una contraseña. Con ese correo la app reconoce tu suscripción.",
    "Mi consejo para hoy: haz una cotización de un mueble que ya hiciste antes. Así comparas con lo que cobraste y ves en 5 minutos cómo te queda la cotización, la lista de cortes y el mueble en 3D.",
    "Tienes 7 días de garantía, así que úsala con trabajos reales desde ya.",
  ],
  boton: { texto: "Hacer mi primera cotización", url: URL_APP },
  posdata: `¿Te trabaste? Únete al grupo de carpinteros INNER y pregunta lo que sea: ${GRUPO_WHATSAPP}`,
};

/** Semana 1 en adelante, en orden. Después de la última se rotan los TIPS. */
export const SEMANAS: Correo[] = [
  {
    asunto: "Cotiza hablando, sin escribir medidas",
    previa: "Dicta el mueble y la app arma la cotización.",
    parrafos: [
      "{nombre}, ¿sabías que puedes cotizar sin escribir?",
      "Toca el micrófono y di algo como: \"closet de 2 metros de ancho, 2,40 de alto, 60 de fondo, con 4 puertas y 3 cajones\". La app entiende las medidas y te arma el mueble.",
      "Es ideal cuando estás donde el cliente, con el metro en la mano.",
    ],
    boton: { texto: "Probar el dictado", url: URL_APP },
  },
  {
    asunto: "¿Estás cobrando lo que es? Revisa tus precios",
    previa: "Cinco minutos en \"Mis precios\" te evitan perder plata en cada mueble.",
    parrafos: [
      "{nombre}, la cotización solo es tan buena como tus precios.",
      "Entra a \"Mis precios\" y pon lo que de verdad te cuesta la lámina, el canto, las bisagras, los rieles y tu mano de obra. Si el melamínico subió, cámbialo ahí y todas tus cotizaciones nuevas salen con el precio al día.",
      "Muchos carpinteros pierden plata sin darse cuenta porque cotizan con precios de hace meses. Que no te pase.",
    ],
    boton: { texto: "Revisar mis precios", url: URL_APP },
  },
  {
    asunto: "Manda los cortes al proveedor sin volver a medir",
    previa: "La orden de corte sale lista en PDF.",
    parrafos: [
      "{nombre}, cuando el cliente te apruebe, no vuelvas a sacar las medidas a mano.",
      "La app te da la orden de corte en PDF con cada pieza, sus medidas y los cantos. Se la mandas al proveedor por WhatsApp y te ahorras el viaje y los errores.",
      "Una pieza mal cortada se come la ganancia de todo el mueble. Mejor que salga bien desde el principio.",
    ],
    boton: { texto: "Ver mi orden de corte", url: URL_APP },
  },
  {
    asunto: "Cobra más rápido: la cotización por WhatsApp",
    previa: "Link, condiciones de pago y anticipo en un solo mensaje.",
    parrafos: [
      "{nombre}, el que cotiza primero, cierra primero.",
      "Desde la app le mandas al cliente la cotización por WhatsApp con un link. Ahí ve el mueble, el total y tus condiciones de pago, incluido el anticipo.",
      "Truco: pide el 50% de anticipo para comprar el material. Si está escrito en la cotización, el cliente lo ve normal y no tienes que pelearlo.",
    ],
    boton: { texto: "Enviar una cotización", url: URL_APP },
  },
  {
    asunto: "Tu logo y tus trabajos venden por ti",
    previa: "Una cotización con tu marca se ve de empresa grande.",
    parrafos: [
      "{nombre}, ¿ya subiste tu logo y fotos de tus trabajos?",
      "Salen en cada cotización que mandas. El cliente ve que eres serio y que ya has hecho muebles como el que te está pidiendo. Eso da confianza y ayuda a cerrar.",
      "No necesitas fotos de revista. Con 3 o 4 fotos de celular de muebles terminados es suficiente.",
    ],
    boton: { texto: "Subir mi logo y fotos", url: URL_APP },
  },
  {
    asunto: "Closets y cocinas grandes sin enredarte",
    previa: "Divide el trabajo en módulos y cotiza tranquilo.",
    parrafos: [
      "{nombre}, los trabajos grandes son los que más dejan, pero también donde más se equivoca uno.",
      "El truco: arma la cocina o el closet por módulos (bajo, aéreo, despensero, cuerpo de closet). La app suma todo, saca los cortes de cada módulo y no se te olvida ni una bisagra.",
      "Así cotizas en minutos lo que antes te tomaba una noche entera con calculadora.",
    ],
    boton: { texto: "Cotizar un trabajo grande", url: URL_APP },
  },
  {
    asunto: "Lo que están haciendo otros carpinteros INNER",
    previa: "Trucos del grupo de WhatsApp.",
    parrafos: [
      "{nombre}, en el grupo de carpinteros INNER se están compartiendo trucos buenísimos: cómo cobran el transporte, cuánto piden de anticipo y qué muebles se están vendiendo más.",
      "Si no estás todavía, entra. Es gratis para los suscriptores y ahí también nos puedes pedir ayuda con la app.",
    ],
    boton: { texto: "Entrar al grupo", url: GRUPO_WHATSAPP },
  },
];

/** Después de la semana 7, un tip por semana, rotando. */
export const TIPS: Correo[] = [
  {
    asunto: "Tip de la semana: cotiza el mismo día",
    previa: "El cliente que espera, se enfría.",
    parrafos: [
      "{nombre}, el cliente que espera 3 días por una cotización casi siempre termina con otro.",
      "Haz la cotización ahí mismo, en el celular, y mándala antes de irte. Es la forma más fácil de ganarle a la competencia.",
    ],
    boton: { texto: "Abrir INNER Muebles", url: URL_APP },
  },
  {
    asunto: "Tip de la semana: no te olvides de cobrar esto",
    previa: "Transporte, instalación y herrajes.",
    parrafos: [
      "{nombre}, los olvidos más comunes al cotizar: transporte, instalación, tiradores y herrajes especiales.",
      "Revisa que estén en \"Mis precios\" para que salgan solos en cada cotización.",
    ],
    boton: { texto: "Revisar mis precios", url: URL_APP },
  },
  {
    asunto: "Tip de la semana: muéstrale el 3D al cliente",
    previa: "Cuando lo ve, lo quiere.",
    parrafos: [
      "{nombre}, cuando el cliente ve su mueble en 3D, con el color que eligió, es mucho más fácil que diga que sí.",
      "Muéstraselo en el celular mientras le explicas el precio.",
    ],
    boton: { texto: "Abrir INNER Muebles", url: URL_APP },
  },
  {
    asunto: "Tip de la semana: haz seguimiento",
    previa: "Un mensaje a los 2 días cierra muchos trabajos.",
    parrafos: [
      "{nombre}, si mandaste una cotización y el cliente no ha respondido, escríbele a los 2 días: \"¿Pudiste revisar la cotización? Si quieres ajustamos algo\".",
      "Muchos trabajos se cierran con ese mensaje y nada más.",
    ],
    boton: { texto: "Abrir INNER Muebles", url: URL_APP },
  },
];

export const RESCATE: Correo = {
  asunto: "{nombre}, ¿todo bien con la app?",
  previa: "Llevas unos días sin entrar. ¿Te ayudamos?",
  parrafos: [
    "{nombre}, vimos que llevas unos días sin entrar a INNER Muebles.",
    "Si algo no te quedó claro o te trabaste en algún paso, escríbenos por WhatsApp y te ayudamos en 5 minutos. Para eso estamos.",
    "Y si es que no ha salido trabajo, aprovecha para dejar tus precios al día. Así, cuando llegue el próximo cliente, cotizas en un momento.",
  ],
  boton: { texto: "Volver a la app", url: URL_APP },
};
