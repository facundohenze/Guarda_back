# Back_Guarda

Backend de la aplicación Guarda con Node.js, Express, MongoDB y autenticación Clerk.

Esta API valida usuarios con Clerk, sincroniza la sesión con una colección de usuarios en MongoDB y expone recursos para gestionar reportes y usuarios.

## Tecnologías

- Node.js
- Express 5
- MongoDB / Mongoose
- Clerk (`@clerk/backend`) para autenticación JWT
- CORS
- dotenv

## Estructura principal

- `app.js` - punto de entrada del servidor
- `config/mongo.js` - conexión a MongoDB
- `routes/` - define los endpoints de la API
- `controllers/` - recibe request/res y llama a servicios
- `service/` - lógica de negocio y permisos
- `models/` - esquemas de MongoDB
- `middlewares/` - autenticación y autorización

## Variables de entorno

Crea un archivo `.env` en la raíz con los datos de tu entorno:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/<nombreDB>
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxx
```

> El `CLERK_SECRET_KEY` debe corresponder a la misma aplicación Clerk que usa el frontend.

## Instalación

```bash
cd back_guarda
npm install
```

## Ejecución

```bash
node app.js
```

El servidor quedará escuchando en el puerto definido en `PORT`.

## Rutas principales

### Autenticación / sincronización

#### POST `/api/auth/sync`

Sincroniza el usuario autenticado con la base de datos local.

- Requiere cabecera `Authorization: Bearer <token>`
- Verifica el token con Clerk.
- Recupera datos del usuario de Clerk y/o MongoDB.
- Crea el usuario local si no existe.
- Devuelve el rol del usuario.

Request headers:

```http
Authorization: Bearer <session_jwt>
Content-Type: application/json
```

Response ejemplo:

```json
{ "role": "citizen" }
```

### Reportes

Todas las rutas de reportes requieren autenticación con `Authorization: Bearer <token>`.

#### POST `/api/reports`

Crea un nuevo reporte.

Body JSON recomendado:

```json
{
  "title": "Bache en la calle",
  "description": "Gran bache en la esquina",
  "category": "bache",
  "location": {
    "lat": -31.419,
    "lng": -64.211,
    "address": "Av. Principal 123"
  },
  "imageUrl": "https://..."
}
```

#### GET `/api/reports`

Lista todos los reportes. Se devuelve información del usuario creador en `userId`.

#### GET `/api/reports/:id`

Devuelve un reporte por su ID.

#### PUT `/api/reports/:id`

Actualiza un reporte.

- Dueño del reporte puede editar `title`, `description`, `category`, `imageUrl`.
- Admin/superadmin puede editar también `priority` y `status`.

#### DELETE `/api/reports/:id`

Elimina un reporte.

- Solo el creador o un admin pueden eliminarlo.

### Usuarios

#### GET `/api/users`

Lista todos los usuarios.

- Esta ruta está protegida a `superadmin`.

#### GET `/api/users/:id`

Devuelve datos de un usuario por ID.

- Esta ruta está protegida para `superadmin`.
- Solo un `superadmin` puede acceder a este endpoint.

#### PUT `/api/users/:id`

Edita un usuario.

- Un usuario puede editar su propio `nombre`.
- `superadmin` puede editar `nombre` y `role`.

#### DELETE `/api/users/:id`

Elimina un usuario.

- Solo `superadmin` puede eliminar usuarios.
- No se debe permitir eliminar el propio usuario si es superadmin.

## Modelos

### User

- `clerkUserId` (String, requerido, único)
- `nombre` (String, requerido)
- `email` (String, requerido, único)
- `role` (`citizen`, `admin`, `superadmin`, default `citizen`)

### Report

- `userId` (ObjectId ref `User`)
- `title` (String requerido)
- `description` (String requerido)
- `category` (`bache`, `luminaria`, `residuos`, `inundacion`, `vandalismo`, `otro`)
- `priority` (`baja`, `media`, `alta`, `critica`, default `baja`)
- `status` (`open`, `in_progress`, `resolved`, default `open`)
- `location` (objeto con `lat`, `lng`, `address`)
- `imageUrl` (String opcional)
- `esPrincipal`, `reportePrincipalId`, `adhesiones`, `adheridos`

## Notas

- El backend depende de Clerk para validar el JWT y obtener al usuario autenticado.
- `requireAuth` valida el token y proporciona datos de la sesión.
- `requireRole` controla permisos adicionales consultando el usuario local en MongoDB.

## Uso recomendado

1. Configura el frontend para usar la misma app Clerk.
2. Autentica el usuario y obtén el JWT.
3. Llama a `/api/auth/sync` para asegurar que el usuario exista en MongoDB.
4. Usa las rutas de reportes y usuarios con el token en el header.

## Token manual

1. Inicia sesión en el frontend.
2. En la consola del navegador, ejecuta `await window.Clerk.session.getToken()`.
3. Usa ese token como `Bearer <token>` en Postman o Insomnia.

