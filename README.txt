SST IA V3 — Módulo especializado EPP / Casco

OBJETIVO
Esta versión elimina las heurísticas de "trabajo en altura" y las inferencias generales que generaban
falsos positivos. La V3 usa un modelo YOLOv8n específico para casco, convertido a TensorFlow.js.

MODELO
Fuente:
https://huggingface.co/lanseria/yolov8n-hard-hat-detection_web_model

Clases:
- Hardhat
- NO-Hardhat

El modelo card reporta mAP@0.5 = 0.836 sobre el dataset de validación hard-hat-detection.

COMPORTAMIENTO
- Verde: Hardhat.
- Rojo: NO-Hardhat.
- La app NO considera "sin casco" simplemente porque no detectó un casco.
- Solo propone alerta cuando existe una detección positiva NO-Hardhat.
- Para reducir falsos positivos, la detección debe repetirse en varias lecturas consecutivas.
- El inspector confirma o descarta la alerta.
- Al confirmar se toma evidencia y se genera el hallazgo.
- El informe final permite imprimir/guardar como PDF.

IMPORTANTE
La primera carga requiere internet para descargar aproximadamente 12 MB del modelo desde Hugging Face.
El navegador puede almacenar el modelo en caché.

ACTUALIZAR GITHUB PAGES
1. Reemplazar index.html y app.js del repositorio actual.
2. README.txt es opcional.
3. Commit changes.
4. No modificar Settings > Pages.
5. Abrir de nuevo https://rosariosafety-eng.github.io/sst-ia/
6. Si aparece la versión anterior, cerrar la pestaña y abrir de nuevo o hacer recarga completa.

PRUEBA RECOMENDADA
1. Normativa: Construcción / obra.
2. Casco: obligatorio.
3. Confianza mínima: 45%.
4. Confirmación IA: 3 lecturas.
5. Probar imágenes/personas:
   - con casco;
   - sin casco;
   - sin personas;
   - gorra común;
   - casco parcialmente oculto.
6. Registrar falsos positivos y falsos negativos.

SIGUIENTE MÓDULO
Después de validar casco/no casco, incorporar un segundo detector para:
- Safety Vest / NO-Safety Vest
- Goggles / NO-Goggles
- Gloves / NO-Gloves

Luego se agregan modelos/datasets específicos para:
- riesgo eléctrico;
- incendio/evacuación;
- máquinas/herramientas;
- caídas y trabajo en altura.

Nota de licencia:
Antes de uso productivo/comercial conviene verificar las condiciones de licencia del modelo y de
las herramientas de exportación asociadas.
