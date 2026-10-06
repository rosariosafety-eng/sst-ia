SST IA V4.4 — CORRECCIÓN DE CONTADOR + INICIO RÁPIDO

CORRECCIONES
1. Contador del desplegable
- Cada checkbox actualiza inmediatamente:
  - contador total de ítems,
  - contador por categoría,
  - resumen de seleccionados,
  - módulos activos.
- Se usa delegación de eventos para que funcione de forma robusta con los 78 ítems.
- La selección queda guardada localmente.

2. Cámara
ANTES:
  botón -> cargar modelo SST (~43 MB) -> abrir cámara.
Eso hacía que en iPhone pareciera que el botón no respondía.

AHORA:
  botón -> abrir cámara INMEDIATAMENTE -> cargar IA después.
- La cámara puede usarse aunque el modelo todavía esté cargando.
- Si la inspección seleccionada solo tiene ítems guiados, NO descarga el modelo SST pesado.
- Si seleccionás ergonomía, carga el motor postural.
- Si seleccionás EPP automático/caídas, carga SafetyVision.
- El estado se informa en pantalla: Cámara activa / IA cargando / IA activa.

3. Rendimiento
- El modelo multi-EPP solo se carga cuando realmente hay una clase automática seleccionada.
- Esto mejora mucho el inicio de inspecciones eléctricas, incendio, almacenamiento, etc., que hoy son guiadas.

PRUEBA RECOMENDADA
A. Contador:
- Abrir “Qué evaluar”.
- Marcar 3 ítems.
- Debe decir “3 ítems” arriba instantáneamente.
- Desmarcar uno -> debe quedar “2 ítems”.

B. Cámara sin modelo pesado:
- Elegir Ninguno.
- Marcar solamente “Tablero / gabinete abierto”.
- Iniciar inspección.
- La cámara debería aparecer casi inmediatamente.
- Debe decir que la IA SST no es requerida.

C. Cámara con IA:
- Marcar Casco.
- Iniciar inspección.
- La cámara aparece primero.
- Luego aparece “Cargando IA SST (~43 MB)”.
- Cuando termina: “IA SST: activa”.

ACTUALIZAR GITHUB
Reemplazar:
- index.html
- app.js

Abrir:
https://rosariosafety-eng.github.io/sst-ia/?v=44
