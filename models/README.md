# models/

Capa de datos. Cada archivo define un esquema de Mongoose y describe cómo se almacenan los documentos en MongoDB.

- No contienen lógica de negocio HTTP.
- No manejan respuestas ni controladores.
- Solo definen la forma de los datos y las relaciones.

## Modelos disponibles

### `userModel.js`

Define el esquema de usuarios locales.

Campos principales:
- `clerkUserId` (String, requerido, único): referencia al ID de Clerk.
- `nombre` (String, requerido): nombre completo del usuario.
- `email` (String, requerido, único): email del usuario.
- `role` (String): puede ser `citizen`, `admin` o `superadmin`. Default `citizen`.

### `reportModel.js`

Define la estructura de un reporte.

Campos principales:
- `userId` (ObjectId ref `User`, requerido): usuario que creó el reporte.
- `title` (String, requerido)
- `description` (String, requerido)
- `category` (String): `bache`, `luminaria`, `residuos`, `inundacion`, `vandalismo`, `otro`.
- `priority` (String): `baja`, `media`, `alta`, `critica`.
- `status` (String): `open`, `in_progress`, `resolved`.
- `location` (Object): `lat`, `lng`, `address`.
- `imageUrl` (String opcional)

Campos adicionales de reporte:
- `esPrincipal` (Boolean): identifica si es el reporte original.
- `reportePrincipalId` (ObjectId ref `Report`): reporte principal si es un adherido.
- `adhesiones` (Number): cantidad de adhesiones.
- `adheridos` (Array): lista de usuarios que se adhirieron y su reporte.

## Uso

Estos modelos se usan desde el servicio para crear, leer, actualizar y eliminar documentos en MongoDB. El resto de la aplicación los trata como objetos de datos.
