# Video "Don Carlos ya no pierde clientes" (9:16, ~28 s)

Fotogramas generados en Higgsfield (GPT Image 2.6 low, 9:16). Cada clip se anima desde su fotograma inicial (image-to-video). Los prompts de video van en inglés porque los modelos responden mejor; los textos en pantalla y la voz van en español y se ponen en el montaje.

Fotogramas (versión actual):
- F1 Hook en pantalla dividida, la clienta escribe y Carlos lee: https://d8j0ntlcm91z4.cloudfront.net/user_2zkI0jM7sJ3yYe3PzFEgTYfZKSN/hf_20261115_151147_71101378-e095-40fb-a22f-bfb88491571e.png
- F2 Taller de noche (personaje base): https://d8j0ntlcm91z4.cloudfront.net/user_2zkI0jM7sJ3yYe3PzFEgTYfZKSN/hf_20261115_145401_ba4e858c-d885-40d4-baf7-71e4ae996767.png
- F3 Dicta con la app en el celular, opción A sobre el hombro: https://d8j0ntlcm91z4.cloudfront.net/user_2zkI0jM7sJ3yYe3PzFEgTYfZKSN/hf_20261115_151058_c5c563ba-eddc-4ecf-a4dc-b5394e4c519a.png
- F3 opción B de frente: https://d8j0ntlcm91z4.cloudfront.net/user_2zkI0jM7sJ3yYe3PzFEgTYfZKSN/hf_20261115_151058_cce7b479-08f0-410a-be96-4fd161f16435.png
- F4 La clienta ve el 3D: https://d8j0ntlcm91z4.cloudfront.net/user_2zkI0jM7sJ3yYe3PzFEgTYfZKSN/hf_20261115_145453_9f6b3db6-2821-4b3d-9a3e-a0fcc2de72b1.png
- F5 Respuesta en pantalla dividida, la clienta escribe y Carlos sonríe: https://d8j0ntlcm91z4.cloudfront.net/user_2zkI0jM7sJ3yYe3PzFEgTYfZKSN/hf_20261115_151147_17879c91-9ed1-441d-8ee8-b7ea1b6b84a0.png
- F6 Taller lleno de trabajo: https://d8j0ntlcm91z4.cloudfront.net/user_2zkI0jM7sJ3yYe3PzFEgTYfZKSN/hf_20261115_145454_d00d297b-9164-4fef-8d33-9abbebba5f00.png

Voz: voz-elevenlabs.mp3 (32,4 s). Los tiempos de abajo están alineados a las pausas de esa voz:

| Tiempo | Voz | Plano | Generar |
|---|---|---|---|
| 0.0–4.1 s | ¿Te ha pasado? ¡Mandas la cotización tres días tarde... | Clip 1 (F1) | 5 s |
| 4.1–10.1 s | ...y el cliente ya se fue con otro! ¡Noches enteras...! | Clip 2 (F2) | 6 s |
| 10.1–15.0 s | ¡Eso se acabó! Mides, le dictas las medidas al celular... | Clip 3 (F3) | 5 s |
| 15.0–21.1 s | ...cortes, láminas, precio y mueble en 3D | Capturas reales de la app (montaje, sin IA) | — |
| 21.1–24.0 s | Se lo muestras al cliente ahí mismo... | Clip 4 (F4) | 4 s |
| 24.0–27.4 s | ...le mandas el PDF... ¡y cierras la venta! | Clip 5 (F5) | 4 s |
| 27.4–30.0 s | ¡INNER Muebles! | Clip 6 (F6) | 4 s |
| 30.0–32.4 s | Empieza hoy por solo quince dólares al mes | Tarjeta CTA | — |

Las duraciones son para Seedance (4 a 15 s). En Kling genera 5 s y se recorta.

---

## Guion para ElevenLabs (pegar tal cual)

Voz recomendada: hombre latino de 30 a 45 años, enérgico, tipo locutor de radio comercial. Modelo Eleven v3 con estabilidad Creative (o en v2: Stability 30 %, Style 60 %, Speed 1.1). Las etiquetas entre corchetes son de v3; si usas Multilingual v2, bórralas. Duración esperada: unos 23 a 25 s.

```
[con energía] ¿Te ha pasado? ¡Mandas la cotización tres días tarde... y el cliente ya se fue con otro!

¡Noches enteras con el cuaderno y la calculadora!

[emocionado] ¡Eso se acabó! Mides, le dictas las medidas al celular... ¡y en cinco minutos tienes los cortes, las láminas, el precio y el mueble en 3D!

Se lo muestras al cliente ahí mismo, le mandas el PDF por WhatsApp... [con entusiasmo] ¡y cierras la venta en el momento!

[con fuerza] ¡INNER Muebles! Empieza hoy por solo quince dólares al mes.
```

---

## Prompts de video (image-to-video, 9:16, sin audio)

Duración: Kling genera 5 o 10 s y Seedance de 4 a 15 s. Abajo va la duración a generar y cuánto se usa en el montaje.

### Clip 1 — Hook (0.0 a 4.1 s) · fotograma F1 · generar 5 s

```
Vertical 9:16 split screen, photorealistic film, 35mm. Keep the split layout exactly as in the start frame: top half the client on her sofa, bottom half Carlos in his night workshop. No audio, no text.

ACTING TASK — CLIENT (top half; fully invested in the tactic; the work happens in the eyes):
SCENE DIRECTION (shared, unspoken): close this matter politely and move on.
MOTIVE: she already waited a week; another carpenter answered the same day.
GOAL: tell him no without sounding rude.
OBSTACLE: she likes Carlos and feels a little bad.
TACTIC: re-reads what she typed, checking the tone word by word, then sends it and puts the phone face down to be done with it.
Moment to moment:
— 0.0–2.0s — types, eyes checking the words on screen.
— 2.0–3.0s — pauses, re-reads, taps send.
— 3.0–5.0s — sets the phone down on the sofa and looks away to her room, done.

ACTING TASK — CARLOS (bottom half; fully invested in the tactic; the work happens in the eyes):
SCENE DIRECTION (shared, unspoken): close this matter and move on.
MOTIVE: he needs this job this month.
GOAL: find out if there is still a chance.
OBSTACLE: the message is clear and he knows it.
TACTIC: reads the message, reads it again looking for an opening, then looks at the notebook on the bench, the quote he never finished.
Moment to moment:
— 1.5–3.0s — the phone lights up, he reads, eyes stopping on the key words.
— 3.0–4.0s — reads again from the top, searching.
— 4.0–5.0s — lowers the phone, eyes go to the notebook on the bench.
(Safety: gaze always engaged in the task, never a frozen, glassy, unfocused stare; natural blinks now and then.)

Camera: both halves static with a very slow push-in. No cuts.
```

### Clip 2 — El antes (4.1 a 10.1 s) · fotograma F2 · generar 6 s

```
Vertical 9:16, photorealistic film, 35mm, night carpentry workshop lit by one hanging tungsten bulb. Start frame: Carlos, mid-40s carpenter, at the workbench with a spiral notebook, a calculator and a half-cut melamine board.

ACTING TASK — CARLOS
SCENE DIRECTION, UNSPOKEN: finish this quote tonight so the client gets it tomorrow.
MOTIVE: he already lost one client this week for being slow; he can't lose another.
GOAL: get the number of boards right so he doesn't lose money on this job.
OBSTACLE: the sums don't match his sketch, and he is too tired to trust his own math.
TACTIC: checks the calculator result against the notebook figure, line by line, eyes going back and forth between the two; erases, re-adds the column with the pencil tip, looks to the board on the bench to measure it with his eyes against the number. Moment-to-moment tasks are given in the timed stages below.
PERFORMANCE CONTINUITY: gaze stays engaged with the current target and question; natural blinking and breathing continue.

0.0–2.0s: he punches numbers into the calculator, eyes jump to the notebook to compare.
2.0–3.5s: he erases a figure in the notebook and rewrites it, eyes checking the half-cut board beside him.
3.5–6.0s: he leans back, rubs his eyes with thumb and finger, then looks again at the page to decide if the number is right.
Camera: slow lateral dolly from left to right at table height. No text, no cuts.
```

### Clip 3 — El cambio (10.1 a 15.0 s) · fotograma F3 (opción A o B) · generar 5 s

```
Vertical 9:16, photorealistic film, 35mm, bright morning daylight in a client's bedroom with an empty wall niche. Start frame: Carlos in front of the measured niche, holding his smartphone with the INNER MUEBLES app open and the green "Dictar mueble por voz" button recording. Keep the phone screen exactly as in the start frame, sharp and unchanged.

ACTING TASK — CARLOS
SCENE DIRECTION, UNSPOKEN: take the measurements once, right, and give the client an answer before leaving the house.
MOTIVE: he wants this client to see he's serious and fast.
GOAL: get the exact width and height into the phone without a single correction.
OBSTACLE: the wall is not perfectly square; one wrong number and the closet won't fit.
TACTIC: reads the tape at the edge, eyes locked on the mark, says the number to the phone; then checks the top of the niche with a glance to confirm the height before saying the next number. Moment-to-moment tasks are given in the timed stages below.
PERFORMANCE CONTINUITY: gaze stays engaged with the current target and question; natural blinking and breathing continue.

0.0–2.0s: he glances at the tape across the niche, then speaks the number into the phone (lips moving naturally, no audio).
2.0–3.5s: he glances up to the top of the niche to check the height, speaks again into the phone.
3.5–5.0s: he looks at the phone screen as the app fills in the furniture, a short nod: the number is right.
Camera: slow push-in from medium shot to medium close-up. No text, no cuts.
```

### Clip 4 — Muestra el 3D (21.1 a 24.0 s) · fotograma F4 · generar 4 s

```
Vertical 9:16, photorealistic film, 35mm, soft daylight, client's bedroom. Start frame: Carlos holding his phone tilted toward the client, a woman in her late 30s; the phone shows a 3D render of a white and wood closet.

ACTING TASK — CARLOS (fully invested in the tactic; the work happens in the eyes):
SCENE DIRECTION (shared, unspoken): decide the closet together, right now, without "I'll think about it".
MOTIVE: he knows a client who leaves to think usually doesn't come back.
GOAL: see in her face that this is the closet she imagined.
OBSTACLE: she might find something she doesn't like and pull back.
TACTIC: watches her eyes, not the phone; when her gaze lands on a detail he tilts the phone a little toward her so she can see it better; waits, without pushing.
Moment to moment:
— 0.0–1.5s — holds the phone steady, checks her eyes to see where she is looking.
— 1.5–3.0s — tilts the phone slightly toward her, checks her reaction.
— 3.0–4.0s — when she smiles, he lets a quiet smile through and waits for her answer.

ACTING TASK — CLIENT (fully invested in the tactic; the work happens in the eyes):
SCENE DIRECTION (shared, unspoken): decide the closet together, right now.
MOTIVE: she's tired of carpenters who promise and never send the quote.
GOAL: make sure it's really what she wants before saying yes.
OBSTACLE: she's been let down before; she doesn't want to get excited too soon.
TACTIC: studies the render detail by detail (the doors, the inside, the color), then looks up at the empty wall to place it there in her mind, then back to the screen to confirm.
Moment to moment:
— 0.0–1.5s — leans in, eyes moving across the screen checking the doors and shelves.
— 1.5–3.0s — glances up at the empty wall niche, back to the screen: it fits.
— 3.0–4.0s — a smile opens, she points at the screen with one finger.
(Safety: gaze always engaged in the task, never a frozen, glassy, unfocused stare; natural blinks now and then.)

Camera: static over-the-shoulder with a very slight push-in. Keep the phone screen content as in the start frame. No text, no cuts.
```

### Clip 5 — La respuesta (24.0 a 27.4 s) · fotograma F5 · generar 4 s

```
Vertical 9:16 split screen, photorealistic film, 35mm, bright daylight. Keep the split layout exactly as in the start frame: top half the client in her bedroom, bottom half Carlos walking to his pickup truck. No audio, no text.

ACTING TASK — CLIENT (top half; fully invested in the tactic; the work happens in the eyes):
SCENE DIRECTION (shared, unspoken): seal the deal before anything changes.
MOTIVE: she finally found someone fast and serious.
GOAL: lock in a start date.
OBSTACLE: none she can see, and that is what she checks one more time.
TACTIC: opens the PDF, scans to the total, glances at the empty wall niche to picture it, then types her yes.
Moment to moment:
— 0.0–1.5s — eyes run down the PDF to the total, a small nod.
— 1.5–4.0s — glances at the niche, back to the phone, types quickly and sends.

ACTING TASK — CARLOS (bottom half; fully invested in the tactic; the work happens in the eyes):
SCENE DIRECTION (shared, unspoken): seal the deal.
MOTIVE: this is the job he would have lost a month ago.
GOAL: make sure it says what he thinks it says.
OBSTACLE: he doesn't want to celebrate too early.
TACTIC: the phone buzzes, he stops walking, reads the message carefully, then lets the smile come and looks up at his truck: there is work.
Moment to moment:
— 1.5–2.5s — phone buzzes, he stops and reads.
— 2.5–4.0s — reads it again, smiles, looks up ahead.
(Safety: gaze always engaged in the task, never a frozen, glassy, unfocused stare; natural blinks now and then.)

Camera: top half static; bottom half slow tracking shot following Carlos, stopping when he stops. No cuts.
```

### Clip 6 — El después (27.4 a 30.0 s) · fotograma F6 · generar 4 s

```
Vertical 9:16, photorealistic film, 35mm, busy carpentry workshop in warm daylight. Start frame: Carlos in the foreground with his phone; a young helper cuts melamine behind him; finished wrapped closets; a board full of order sheets.

ACTING TASK — CARLOS
SCENE DIRECTION, UNSPOKEN: keep the workshop moving; deliveries go out today.
MOTIVE: for the first time in months he has more work than time.
GOAL: confirm the next client's delivery date without stopping the shop.
OBSTACLE: everything needs him at once.
TACTIC: reads the new message on the phone, glances up to the helper's cut to check it's on track, then to the order board to find a free day, and back to the phone to answer. Moment-to-moment tasks are given in the timed stages below.
PERFORMANCE CONTINUITY: gaze stays engaged with the current target and question; natural blinking and breathing continue.

ACTING TASK — HELPER (silent listener): finish this cut clean so Carlos doesn't have to redo it; eyes on the blade line, one quick look to Carlos to see if he approves.

0.0–2.0s: Carlos reads the phone; behind him the saw runs through the board.
2.0–3.5s: he glances at the helper's cut, then to the order board.
3.5–5.0s: he types a short reply with his thumb, a calm half-smile.
Camera: slow dolly back revealing the workshop. No text, no cuts.
```

### Cierre — CTA (30.0 a 32.4 s)

No necesita video: tarjeta navy #0B1F3A con el logo INNER Muebles y "Empieza hoy por US$15/mes" en menta #00D9A3. Se arma en el montaje.

---

## Textos en pantalla (para el montaje)

| Tiempo | Texto |
|---|---|
| 0.0–4.1 s | ¿TE HA PASADO? |
| 4.1–10.1 s | 3 DÍAS PARA UNA COTIZACIÓN |
| 10.1–15.0 s | DICTAS LAS MEDIDAS |
| 15.0–21.1 s | CORTES · LÁMINAS · PRECIO · 3D EN 5 MINUTOS |
| 21.1–27.4 s | CIERRA LA VENTA EN EL MOMENTO |
| 27.4–30.0 s | MÁS PEDIDOS, MENOS NOCHES EN VELA |
| 30.0–32.4 s | Tarjeta CTA US$15/mes |

Los subtítulos de la voz van aparte, palabra por palabra.

Sobre los clips 3 y 4 conviene poner encima la captura real de la app (el botón "Dictar mueble por voz" y la vista 3D) para que se vea el producto de verdad.
