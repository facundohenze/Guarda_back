# middlewares/

Funciones que se ejecutan antes de que el request llegue al controlador.

- `authMiddleware.js` — verifica el token JWT de Clerk. Si el token
  no es válido o no existe, rechaza el request con 401.
- `roleMiddleware.js` — verifica el rol del usuario dentro del token.
  Si el rol no tiene permiso para esa ruta, rechaza con 403.

El orden importa: primero se verifica identidad (auth), después permisos (role).