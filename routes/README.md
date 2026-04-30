# routes/

Define los endpoints de la API y los conecta con los controladores.

- Cada archivo agrupa las rutas de un recurso (ej. /reports).
- Acá se aplican los middlewares de autenticación y autorización.
- No contiene lógica, solo mapea URLs a funciones del controlador.

Ejemplo: GET /reports → reportController.getReports
         POST /reports → reportController.createReport