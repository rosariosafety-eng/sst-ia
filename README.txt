SST IA V2 — versión experimental automática

QUÉ CAMBIA RESPECTO DE V1
- Mantiene la cámara en vivo y detección general.
- Agrega propuestas automáticas de riesgo.
- La IA NO registra sola: propone -> inspector confirma/descarta.
- Primeras reglas automáticas:
  1. Posible interacción persona–vehículo.
  2. Posible trabajo en altura por geometría de escena.
  3. Casco no visible en contexto de obra/altura mediante análisis experimental de la región de cabeza.
- Mantiene registro manual para el resto de riesgos.
- Genera informe legible e imprimible/PDF.

IMPORTANTE
La detección de trabajo en altura de esta V2 todavía es heurística. Puede dar falsos positivos si:
- la cámara apunta hacia arriba;
- la persona está lejos;
- el encuadre no contiene el piso;
- existe perspectiva forzada.
Por eso la app pide confirmación humana.

CÓMO ACTUALIZAR GITHUB
1. Subir index.html y app.js reemplazando los actuales.
2. Commit changes.
3. No hace falta tocar GitHub Pages.
4. En iPhone, cerrar la pestaña vieja y volver a abrir la URL.
5. Si Safari conserva una versión anterior, usar recarga o borrar datos del sitio.

PRUEBA SUGERIDA
- Contexto: Obra / altura.
- Casco: según contexto.
- Apuntar a una foto o situación con una persona elevada.
- Esperar 2–5 segundos.
- Si aparece alerta amarilla, confirmar o descartar.
- Generar informe al finalizar.
