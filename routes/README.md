# routes/

Define los endpoints de la API y conecta las URLs con los controladores.

- Cada archivo agrupa las rutas de un recurso.
- Aquí se aplican middlewares de autenticación y autorización.
- No contiene lógica de negocio.

## Archivos principales

### `authRoutes.js`

Rutas de autenticación / sincronización:
- `POST /api/auth/sync` — sincroniza al usuario autenticado con MongoDB.

### `reportRoutes.js`

Rutas de reportes protegidas:
- `POST /api/reports` — crear reporte.
- `GET /api/reports` — listar reportes.
- `GET /api/reports/:id` — ver reporte por ID.
- `PUT /api/reports/:id` — editar reporte.
- `DELETE /api/reports/:id` — eliminar reporte.

Todas las rutas de reportes usan `requireAuth`.

### `userRoutes.js`

Rutas de usuario:
- `GET /api/users` — listar todos los usuarios. Protegido con `requireRole('superadmin')`.
- `GET /api/users/:id` — ver usuario por ID. Protegido con `requireRole('superadmin')`.
- `PUT /api/users/:id` — editar un usuario. Requiere autenticación. El controlador usa `req.user` para validar permisos si se aplica un middleware de rol.
- `DELETE /api/users/:id` — eliminar un usuario. Requiere autenticación. El controlador usa `req.user` para validar permisos si se aplica un middleware de rol.

## Ejemplo de mapeo

- `GET /api/reports` → `reportController.getAllReports`
- `POST /api/reports` → `reportController.createReport`
- `POST /api/auth/sync` → `userController.syncUser`
- `GET /api/users/:id` → `userController.getUsersById`
