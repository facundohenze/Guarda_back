# controllers/

Capa de orquestación HTTP. Los controladores reciben las peticiones del router, llaman a la lógica de negocio del service y devuelven la respuesta.

- Reciben `req` y `res`.
- Llaman a funciones de `service/`.
- Mapean errores a respuestas HTTP (200, 201, 403, 404, 500).
- No implementan reglas de negocio complejas.

## Controladores principales

### `reportController.js`

Funciones:
- `createReport(req, res)` — crea un reporte.
- `getAllReports(req, res)` — lista todos los reportes.
- `getReportById(req, res)` — devuelve un reporte por ID.
- `updateReport(req, res)` — actualiza un reporte con permisos.
- `deleteReport(req, res)` — elimina un reporte con permisos.

### `userController.js`

Funciones:
- `syncUser(req, res)` — sincroniza el usuario Clerk con MongoDB.
- `getAllUsers(req, res)` — lista todos los usuarios.
- `getUsersById(req, res)` — devuelve un usuario por ID.
- `updateUser(req, res)` — actualiza un usuario.
- `deleteUser(req, res)` — elimina un usuario.

## Responsabilidades

- Validar datos básicos del request.
- Pasar datos correctos al service.
- Convertir errores de servicio en códigos HTTP adecuados.
- Mantener el flujo HTTP separado de la lógica de negocio.
