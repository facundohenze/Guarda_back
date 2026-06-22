# Back_Guarda

Backend de la aplicación **Guarda!** — plataforma de reporte de incidentes urbanos para Villa María, Argentina.

Construido con Node.js, Express, MongoDB y autenticación Clerk. Incluye análisis de reportes con IA (Google Gemini) para validación, clasificación de severidad y detección de duplicados.

## Tecnologías

- Node.js + Express 5
- MongoDB / Mongoose
- Clerk (`@clerk/backend`) — autenticación JWT y gestión de usuarios
- Google Gemini (`@google/genai`) — análisis e IA
- CORS, dotenv

## Estructura

```
back_guarda/
├── app.js                  # punto de entrada
├── config/mongo.js         # conexión a MongoDB
├── routes/                 # endpoints
├── controllers/            # manejo de request/response
├── service/                # lógica de negocio
│   ├── iaService.js        # análisis con Gemini
│   ├── reportService.js    # lógica de reportes
│   └── userService.js      # lógica de usuarios
├── models/                 # esquemas Mongoose
└── middlewares/            # auth y roles
```

## Variables de entorno

Crea un archivo `.env` en la raíz:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/<nombreDB>
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxx
GEMINI_API_KEY=tu_api_key_de_gemini
GEMINI_API_KEY_2=tu_api_key_de_respaldo   # opcional — fallback si la primera agota cuota
PUBLIC_API_KEY=clave_para_rutas_publicas
```

> `CLERK_SECRET_KEY` debe corresponder a la misma app Clerk que usa el frontend.
> `GEMINI_API_KEY_2` actúa como respaldo automático si la key principal recibe un error 429.

## Instalación y ejecución

```bash
npm install
node app.js
```

El servidor queda escuchando en el puerto definido en `PORT`.

---

## Rutas de la API

### Autenticación

#### `POST /api/auth/sync`

Sincroniza el usuario autenticado de Clerk con MongoDB. Crea el documento local si no existe.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{ "role": "citizen", "mongoId": "6649a..." }
```

---

### Reportes — `/api/reports`

Todas las rutas requieren `Authorization: Bearer <token>`.

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `POST` | `/` | Autenticado | Crea un reporte. Pasa por validación IA (spam, emergencias), normalización de texto y detección de duplicados/similares. |
| `GET` | `/` | admin, superadmin | Lista todos los reportes principales con datos del creador. |
| `GET` | `/me` | Autenticado | Reportes del usuario autenticado. |
| `GET` | `/nearby` | Autenticado | Reportes abiertos en un radio dado (query: `lat`, `lng`, `radius`). |
| `GET` | `/heatmap` | admin, superadmin | Puntos para mapa de calor con score ponderado por severidad, adhesiones y antigüedad. |
| `GET` | `/mapa-ciudadano` | Autenticado | Reportes activos filtrados por `etiquetas2` (impacto circulación/seguridad). Acepta `lat`, `lng`, `radius`. |
| `POST` | `/:id/adherir` | Autenticado | Adhiere el usuario a un reporte existente. |
| `GET` | `/:id/historial` | Autenticado | Historial de cambios de estado del reporte. |
| `GET` | `/:id` | admin, superadmin | Ver un reporte por ID. |
| `PUT` | `/:id` | Autenticado | Editar reporte. El dueño edita título/descripción/categoría. El admin también puede cambiar `status` y `priority`. |
| `DELETE` | `/:id` | Autenticado | Elimina el reporte (solo dueño o admin). |

**Body para `POST /`:**
```json
{
  "title": "Bache en calle Sarmiento",
  "description": "Bache profundo frente al número 450",
  "category": "Calles",
  "location": { "lat": -32.41, "lng": -63.23, "address": "Sarmiento 450" },
  "imageUrls": ["https://..."],
  "forzarCreacion": false
}
```

**Respuestas posibles de `POST /`:**

| Status | Significado |
|--------|-------------|
| `201` | Reporte creado correctamente |
| `200` | Hay reportes similares — devuelve `{ pendiente: true, similares: [...] }` para que el usuario decida |
| `409` | Reporte duplicado del mismo usuario — devuelve `{ esDuplicado: true }` |
| `422` | Reporte rechazado por IA (spam, contenido inválido o emergencia que requiere llamar al 100/101/107) — devuelve `{ rechazado: true, razon: "..." }` |

---

### Usuarios — `/api/users`

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `POST` | `/create-admin` | superadmin | Crea un usuario admin en Clerk y MongoDB. |
| `GET` | `/` | superadmin | Lista todos los usuarios. |
| `GET` | `/:id` | superadmin | Ver un usuario por ID. |
| `PUT` | `/:id` | Autenticado | Editar usuario. El propio usuario puede cambiar `nombre`. El superadmin puede cambiar `nombre`, `role` e `isActive`. |
| `DELETE` | `/:id` | superadmin | Soft delete: desactiva el usuario y lo banea en Clerk. |

**Body para `POST /create-admin`:**
```json
{
  "nombre": "Juan López",
  "email": "juan@municipio.com",
  "password": "minimo8caracteres"
}
```

---

### API pública — `/api/public`

Requieren header `x-api-key: <PUBLIC_API_KEY>`. No requieren sesión de usuario.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/resumen` | Estadísticas completas de reportes. |
| `GET` | `/total` | Cantidad total de reportes. |
| `GET` | `/por-estado` | Reportes agrupados por estado. |
| `GET` | `/por-categoria` | Reportes agrupados por categoría. |

---

## Lógica de IA (iaService)

Todas las funciones usan Google Gemini con reintentos automáticos ante errores de sobrecarga (503). Los errores de cuota (429) fallan rápido y si hay una segunda key configurada (`GEMINI_API_KEY_2`), se usa automáticamente como respaldo.

| Función | Descripción |
|---------|-------------|
| `validateReport` | Detecta spam, contenido ficticio, fuera de lugar, ofensivo o situaciones de emergencia que deben derivarse al 100/101/107. |
| `normalizeReport` | Corrige ortografía y redacción sin cambiar el significado. |
| `analyzeReport` | Asigna `severidad`, `etiquetas`, `etiquetas2` (impacto circulación/seguridad) y `resumen`. |
| `analyzeSimilarReports` | Compara el reporte nuevo con cercanos para detectar duplicados y similares. Tiene fallback rule-based si la IA falla. |

---

## Modelos

### User

| Campo | Tipo | Notas |
|-------|------|-------|
| `clerkUserId` | String | único, requerido |
| `nombre` | String | requerido |
| `email` | String | único, requerido |
| `role` | `citizen` \| `admin` \| `superadmin` | default `citizen` |
| `isActive` | Boolean | default `true` |
| `deletedAt` | Date | null si activo |

### Report

| Campo | Tipo | Notas |
|-------|------|-------|
| `userId` | ObjectId | ref `User` |
| `title` | String | requerido |
| `description` | String | requerido |
| `category` | String | Calles, Alumbrado, Higiene urbana, Tránsito, Espacios verdes, Otro |
| `priority` | `baja` \| `media` \| `alta` \| `critica` | se recalcula con adhesiones |
| `status` | `open` \| `in_progress` \| `resolved` | default `open` |
| `location` | `{ lat, lng, address }` | requerido |
| `imageUrls` | String[] | opcional |
| `esPrincipal` | Boolean | false si es un reporte adherido |
| `adhesiones` | Number | cantidad de adhesiones |
| `adheridos` | Array | `[{ userId, reporteId }]` |
| `aiAnalysis` | Object | `{ severidad, etiquetas, etiquetas2, resumen }` |

---

## Middlewares

- **`requireAuth`** — valida el JWT de Clerk, carga `req.clerkUserId` y `req.user` (documento MongoDB).
- **`requireRole(...roles)`** — verifica que `req.user.role` esté entre los roles permitidos.
- **`requireApiKey`** — valida el header `x-api-key` contra `PUBLIC_API_KEY` para rutas públicas.

---

## Obtener token manualmente (Postman / Insomnia)

1. Iniciá sesión en el frontend.
2. En la consola del navegador: `await window.Clerk.session.getToken()`
3. Usá ese valor como `Authorization: Bearer <token>`.
