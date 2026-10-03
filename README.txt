SST IA — V1

Qué hace
- Abre la cámara del celular.
- Ejecuta detección general de objetos/personas en el navegador con COCO-SSD.
- Dibuja cajas de detección en vivo.
- Genera una alerta experimental de proximidad persona–vehículo.
- Permite capturar evidencia y registrar condiciones/actos inseguros.
- Relaciona hallazgos con normativa argentina inicial.
- Guarda hallazgos en el navegador y exporta JSON.

Cómo probarlo
1. Debe publicarse por HTTPS (o localhost). No alcanza con abrir index.html como archivo local en iPhone/Android.
2. Subí la carpeta a GitHub Pages, Netlify, Vercel o cualquier hosting HTTPS.
3. Abrí la URL desde el celular y autorizá la cámara.
4. Tocá “Iniciar inspección”.

Limitación de la V1
El detector incluido es general. Todavía NO reconoce de forma confiable casco, antiparras, guantes, matafuego obstruido, tablero abierto, resguardos, derrames, etc. La interfaz y el motor de reglas están preparados para incorporar un modelo SST específico (YOLO/ONNX) en la siguiente etapa.

Normativa base
Ley 19.587; Decreto 351/79; Anexos VI y VII; Resolución MTEySS 295/2003; Resolución SRT 960/2015 cuando corresponda.
