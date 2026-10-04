SST IA V4 — PREVENCIÓN DE ACCIDENTES

CAMBIO DE ENFOQUE
La V4 parte de los accidentes y exposiciones que se deben prevenir, no de los objetos que casualmente
pueda reconocer una IA general.

FAMILIAS DE RIESGO INCORPORADAS
1. Caídas al mismo nivel.
2. Caídas a distinto nivel / trabajo en altura.
3. Falta de EPP.
4. Riesgo eléctrico.
5. Máquinas y herramientas.
6. Tránsito interno / autoelevadores.
7. Almacenamiento, izaje y caída de objetos.
8. Incendio y evacuación.
9. Sustancias químicas / derrames.
10. Ergonomía y manipulación manual de cargas.
11. Espacios confinados.

DETECCIÓN AUTOMÁTICA
Modelo: SafetyVision YOLOv8 v2, ONNX 640.
Clases: Fall-Detected, Gloves, Goggles, Hardhat, Mask, NO-Gloves, NO-Goggles,
NO-Hardhat, NO-Mask, NO-Safety Vest, No_Harness, Person, Safety Vest.

La app solo alerta por falta de un EPP si el inspector marcó previamente que ese EPP es obligatorio
para la tarea. Fall-Detected se trata como evento crítico y siempre requiere confirmación.

RIESGOS GUIADOS
La V4 NO inventa detección de tablero abierto, matafuego obstruido, máquina sin resguardo, derrame,
estiba inestable, ergonomía o ingreso a espacio confinado. Esos riesgos aparecen en el mapa preventivo
para inspección guiada y registro de evidencia con normativa y acción sugerida.

NORMATIVA PRINCIPAL
- Ley 19.587.
- Decreto 351/79.
- Decreto 911/96 para construcción.
- Resolución SRT 960/2015 para autoelevadores.
- Resolución MTEySS 295/2003 para ergonomía y levantamiento manual de cargas.
- Resolución SRT 953/2010 + IRAM 3625/2003 para espacios confinados.
- Resolución SRT 299/2011 para registro de entrega de EPP.

ACTUALIZAR GITHUB
1. Reemplazar index.html y app.js en el repositorio sst-ia.
2. Commit changes.
3. No tocar Settings > Pages.
4. Abrir: https://rosariosafety-eng.github.io/sst-ia/?v=4

PRIMERA CARGA
El modelo ONNX pesa aproximadamente 43 MB, por lo que conviene hacer la primera prueba con Wi-Fi.
Después el navegador puede reutilizar recursos en caché.

PRUEBA SUGERIDA
- Marcar Casco obligatorio y probar con/sin casco.
- Marcar Antiparras y probar con/sin protección ocular.
- Marcar Arnés solo en una tarea donde efectivamente corresponda.
- Probar una imagen/video de caída.
- Registrar manualmente una condición eléctrica desde el mapa preventivo y generar informe.

NOTA
La aplicación es un sistema de pre-screening y apoyo al profesional. No debe usarse para sanción,
decisión legal, disciplinaria o aseguradora sin validación humana y evaluación integral del contexto.
