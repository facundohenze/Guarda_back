# services/

Capa de lógica de negocio. Aquí se implementan permisos, validaciones de reglas y coordinación entre modelos.

- Recibe datos ya validados desde el controlador.
- Aplica reglas de negocio y permisos.
- Coordina operaciones de los modelos.
- No usa `req` ni `res`.
- Está pensada para ser testeada de forma unitaria.

## Servicios disponibles

### `userService.js`

Funciones principales:
- `syncUser(clerkUserId, nombre, email)`
  - Busca un usuario local por `clerkUserId`.
  - Si no existe, obtiene datos del usuario desde Clerk.
  - Crea el usuario en MongoDB si hace falta.
  - Devuelve `{ role: user.role }`.

- `getAllUsers()`
  - Devuelve todos los usuarios locales.

- `getUsersById(userId, reqUser)`
  - Busca un usuario por ID.
  - Devuelve el usuario.
  - El control de acceso para esta ruta se aplica en el router con `requireRole('superadmin')`.

- `updateUser(targetUserId, reqUser, updates)`
  - Solo `superadmin` o el propio usuario pueden editar.
  - Solo `superadmin` puede cambiar `role`.
  - Un usuario normal puede editar su `nombre`.

- `deleteUser(userId, reqUser)`
  - Solo `superadmin` puede eliminar usuarios.
  - No permite que el superadmin se elimine a sí mismo.

### `reportService.js`

Funciones principales:
- `createReport(clerkUserId, reportData)`
  - Busca al usuario local por `clerkUserId`.
  - Crea un reporte vinculado a ese usuario.

- `getAllReports()`
  - Devuelve todos los reportes.
  - Popula `userId` con datos de usuario.

- `getReportById(reportId)`
  - Devuelve un reporte por ID.
  - Popula `userId` con datos de usuario.

- `updateReport(reportId, clerkUserId, updates)`
  - Busca el reporte y el usuario local.
  - Solo el creador o admin puede editar.
  - Los campos editables dependen del rol.

- `deleteReport(reportId, clerkUserId)`
  - Solo el creador o admin puede eliminar el reporte.

## Responsabilidades

- El service sabe quién puede hacer qué.
- El controlador solo entrega los datos y maneja la respuesta.
- El modelo solo sabe cómo guardar y leer datos.

## Notas

- `userService` usa `@clerk/backend` para sincronizar datos cuando el usuario no existe localmente.
- `reportService` conecta reportes con usuarios y valida permisos antes de modificar o eliminar.
