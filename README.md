# Back_Guarda

Backend de la aplicación Guarda, un servicio Node.js + Express que valida autenticación con Clerk, gestiona usuarios en MongoDB y expone APIs para sincronizar usuarios y CRUD de reportes.

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
- `routes/` - definición de rutas
- `controllers/` - lógica de controladores de request
- `service/` - lógica de negocio y acceso a datos
- `models/` - esquemas de MongoDB
- `middlewares/requireAuth.js` - verificación de token Clerk

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

## Rutas disponibles

### Autenticación

#### POST `/api/auth/sync`

Sincroniza el usuario autenticado con la base de datos.

- Requiere cabecera `Authorization: Bearer <token>`
- Verifica el token con Clerk.
- Crea el usuario en MongoDB si no existe.
- Devuelve el rol del usuario.

#### Request headers

```http
Authorization: Bearer <session_jwt>
Content-Type: application/json
```

#### Response

```json
{ "role": "user" }
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

Lista todos los reportes.

#### GET `/api/reports/:id`

Devuelve un reporte por id.

#### PUT `/api/reports/:id`

Actualiza un reporte. Se permiten los campos:
- `title`
- `description`
- `category`
- `priority`
- `status`
- `imageUrl`

#### DELETE `/api/reports/:id`

Elimina un reporte. Solo el creador o un admin pueden eliminarlo.

## Modelos

### User

- `clerkUserId` (String, requerido, único)
- `nombre` (String, requerido)
- `email` (String, requerido, único)
- `role` (`user` o `admin`, default `user`)

### Report

- `userId` (ObjectId ref `User`)
- `title` (String)
- `description` (String)
- `category` (`bache`, `luminaria`, `residuos`, `inundacion`, `vandalismo`, `otro`)
- `priority` (`baja`, `media`, `alta`, `critica`)
- `status` (`open`, `in_progress`, `resolved`)
- `location` (lat, lng, address)
- `imageUrl` (String opcional)

## Notas

- El backend depende de Clerk para validar el JWT y obtener el usuario.
- El middleware `requireAuth` extrae `clerkUserId`, `nombre` y `email` desde Clerk y los pasa al request.

## Sugerencia de uso

1. Configura el frontend para usar la misma app Clerk.
2. Regístrate en el frontend.
3. El backend recibirá el token y sincronizará al usuario en MongoDB.

## Manejar token manualmente(sino lo manda el front)

1. Registrarse o inciar sesion en el front
2. En la consola del navegador escribir await window.Clerk.session.getToken() y te dara el token
3. En Postman o Bruno -> Authorization, Type: Bearer Token y pegar token
4. Eso iria en las rutas que requieren del token
