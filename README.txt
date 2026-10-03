SST IA V2.1 — corrección de falsos positivos y normativa

CAMBIOS PRINCIPALES
1. La detección automática de trabajo en altura SOLO se ejecuta si el usuario selecciona:
   Contexto: Obra / altura.
   En Riesgo eléctrico, Taller, Depósito, Incendio o General no puede disparar la regla de altura.

2. Se agregó:
   - Contexto: Riesgo eléctrico.
   - Contexto: Incendio / evacuación.
   - Selector de marco normativo:
       a) Establecimiento general -> Decreto 351/79.
       b) Construcción / obra -> Decreto 911/96.

3. Trabajo en altura:
   - Establecimiento general: Decreto 351/79, art. 200.
   - Construcción: Decreto 911/96, arts. 52, 54, 55 y 112.
   El Decreto 911/96 es el reglamento específico para industria de la construcción.

4. Riesgo eléctrico:
   - Establecimiento general: Decreto 351/79, arts. 95-102 + Anexo VI.
   - Construcción: Decreto 911/96, arts. 74-87 (y art. 64 para proximidad a líneas/servicios).

5. Se agregó "Contexto visual IA", que muestra las principales etiquetas que obtiene el clasificador.
   Esto sirve para depurar qué entiende la IA de cada escena.

6. Sensibilidad automática:
   - Estricta (recomendada para pruebas): menos falsos positivos.
   - Balanceada: más sensible.

LIMITACIÓN IMPORTANTE
La V2.1 sigue usando un detector general y un clasificador general. No es todavía un modelo SST entrenado
específicamente para tableros abiertos, matafuegos obstruidos, arnés/no arnés, etc. Por eso:
- puede proponer riesgos, pero requiere confirmación;
- una instalación eléctrica detectada no equivale a condición insegura;
- la detección de ausencia de EPP requiere un modelo específico para alcanzar buena precisión.

ACTUALIZACIÓN EN GITHUB
Reemplazar index.html y app.js en el repositorio sst-ia.
No hace falta modificar GitHub Pages.
