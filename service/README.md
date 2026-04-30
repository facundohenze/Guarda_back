# services/

Capa de lógica de negocio. Es el cerebro de la aplicación.

- Recibe datos ya validados desde el controlador.
- Aplica reglas: ej. solo un admin puede cambiar el estado de un reporte.
- Coordina operaciones sobre los modelos.
- No usa req ni res, no define rutas.
- Es la capa más fácil de testear de forma unitaria.

Ejemplo: `reportService.js` verifica permisos y delega al modelo.