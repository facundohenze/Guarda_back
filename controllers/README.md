# controllers/

Capa de orquestación HTTP. Es el intermediario entre las rutas y los servicios.

- Recibe el request (req) y devuelve el response (res).
- Llama al service correspondiente y maneja errores HTTP.
- No contiene lógica de negocio — solo coordina.

Ejemplo: `reportController.js` recibe el POST /reports,
llama a reportService.createReport() y responde con el resultado.