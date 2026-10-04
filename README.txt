SST IA V4.1 — ALTA SENSIBILIDAD

Cambios principales
- Modo Máxima sensibilidad por defecto.
- Umbral de detección aprox. 25% (antes 42%).
- Alerta desde 1 lectura en modo Máxima/Alta.
- Barrido de detalle activado: además de la imagen completa analiza una zona ampliada por ciclo.
  Esto ayuda con EPP/personas pequeñas o lejanas.
- Frecuencia de análisis aumentada.
- Todas las etiquetas visuales ahora se muestran en español:
  CASCO, SIN CASCO, ANTIPARRAS, SIN ANTIPARRAS, GUANTES, SIN GUANTES,
  CHALECO, SIN CHALECO, SIN ARNÉS, PERSONA, CAÍDA DETECTADA, etc.
- Selector de sensibilidad:
  MÁXIMA / Alta / Equilibrada.
- El inspector sigue confirmando o descartando alertas.

IMPORTANTE
Más sensibilidad = más detecciones débiles y también más falsos positivos.
Por eso:
1. Usar MÁXIMA durante las pruebas.
2. Si aparecen muchas falsas detecciones, pasar a Alta.
3. Para uso estable/productivo, probablemente convenga Equilibrada o ajustar por clase.

LIMITACIÓN DEL TABLERO ELÉCTRICO
Esta versión NO agrega detección automática de tableros eléctricos.
SafetyVision no fue entrenado con clases como:
- tablero eléctrico,
- interruptor termomagnético,
- disyuntor diferencial,
- partes activas,
- puerta/tapa abierta.

Bajar el umbral no puede crear una clase que el modelo no conoce.
El riesgo eléctrico continúa disponible como inspección guiada hasta incorporar un detector eléctrico específico.

ACTUALIZACIÓN GITHUB
1. Reemplazar index.html y app.js.
2. Commit changes.
3. No modificar Pages.
4. Abrir:
   https://rosariosafety-eng.github.io/sst-ia/?v=41
