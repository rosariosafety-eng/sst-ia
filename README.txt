SST IA V4.5 — VERSIÓN ESTABLE

Correcciones verificadas:
1. Se corrigió una etiqueta HTML mal formada en poseStatus.
2. Se restauraron los controles de Sensibilidad y Barrido de detalle que el JavaScript todavía esperaba.
3. Se protegieron referencias a controles opcionales para evitar que un elemento faltante detenga toda la aplicación.
4. El contador de selección fue probado:
   - 0 ítems -> marcar “Tablero / gabinete abierto” -> 1 ítem.
   - marcar otro ítem eléctrico -> 2 ítems.
   - el contador de la categoría también cambia.
5. El botón “Iniciar inspección” tiene el evento correctamente enlazado.
6. La cámara se solicita primero; la IA se carga después.
7. Si solo se seleccionan controles guiados, no es necesario cargar el modelo SST pesado.
8. Si ocurre un error JavaScript, se muestra en el recuadro de estado en vez de quedar aparentemente congelado.

ACTUALIZACIÓN
Reemplazar en GitHub:
- index.html
- app.js

No modificar GitHub Pages.

Abrir:
https://rosariosafety-eng.github.io/sst-ia/?v=45

PRUEBA
1. Abrir “Qué evaluar”.
2. Marcar “Tablero / gabinete abierto”.
3. El contador debe mostrar 1 ítem.
4. Marcar “Partes activas accesibles”.
5. Debe mostrar 2 ítems.
6. Tocar “Iniciar inspección”.
7. iPhone debe solicitar/usar cámara inmediatamente.
