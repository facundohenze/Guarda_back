# SuperAdmin — Cambios y funcionalidad

## Nuevo endpoint: `POST /api/users/create-admin`

Permite a un `superadmin` crear un nuevo usuario con rol `admin` directamente desde el backend, sin que el usuario tenga que registrarse desde el frontend.

El proceso crea el usuario en **Clerk** y en **MongoDB** de forma atómica: si Clerk falla, no se escribe nada en la base de datos.

### Acceso

```
POST /api/users/create-admin
Authorization: Bearer <token_de_superadmin>
Content-Type: application/json
```

### Body

```json
{
  "nombre": "María Admin",
  "email": "maria@empresa.com",
  "password": "ContraseñaSegura123!"
}
```

Todos los campos son requeridos.

### Respuestas

**`201` — Admin creado:**
```json
{
  "_id": "...",
  "clerkUserId": "user_...",
  "nombre": "María Admin",
  "email": "maria@empresa.com",
  "role": "admin",
  "isActive": true,
  "createdAt": "2026-06-16T..."
}
```

**Errores:**

| Código | Motivo |
|---|---|
| `400` | Falta `nombre`, `email` o `password` |
| `403` | El token no pertenece a un `superadmin` |
| `409` | Ya existe un usuario con ese email en MongoDB |
| `500` | Clerk rechazó la operación (ver más abajo) |

### Error 500 — contraseña filtrada

Clerk valida las contraseñas contra bases de datos de brechas conocidas (Have I Been Pwned). Si la contraseña fue encontrada en alguna brecha, responde:

```json
{
  "error": "Error al crear usuario en Clerk: Password has been found in an online data breach. For account safety, please use a different password."
}
```

Usar contraseñas únicas y fuertes. Contraseñas genéricas como `TestPass123!` son rechazadas.

---

## Fix: `getReportsByUser` ya no lanza error si el usuario no existe

**Archivo:** `service/reportService.js`

**Antes:**
```js
if (!user) throw new Error("Usuario no encontrado en la base de datos");
```

**Después:**
```js
if (!user) return [];
```

Si el `clerkUserId` no tiene un usuario sincronizado en MongoDB (por ejemplo, un usuario nuevo que aún no hizo sync), el endpoint `GET /api/reports/me` devuelve un array vacío en lugar de un `500`.
