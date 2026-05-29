# middlewares/

Funciones que se ejecutan antes de que el request llegue al controlador.

- `requireAuth.js` — valida el token JWT con Clerk.
  - Extrae el token de `Authorization: Bearer <token>`.
  - Verifica el token con Clerk y obtiene datos de sesion.
  - Accede y guarda el clerkUserId
  - Añade a `req`: `clerkUserId`.
  - Devuelve 401 si el token no existe o no es válido.

- `roles.js` — controla permisos según el rol local en MongoDB.
  - Busca al usuario local por `req.clerkUserId`.
  - Comprueba si su `role` está entre los permitidos.
  - Adjunta el usuario local como `req.user`.
  - Devuelve 403 si el rol no tiene permiso.

## Orden recomendado

1. `requireAuth` para validar identidad.
2. `requireRole(...)` para permisos específicos.

## Ejemplo de uso

- `router.get('/api/reports', requireAuth, reportController.getAllReports)`
- `router.get('/api/users', requireAuth, requireRole('superadmin'), userController.getAllUsers)`

El middleware asegura que el request tenga identidad y, si corresponde, el rol necesario.
