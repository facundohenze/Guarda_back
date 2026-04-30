# models/

Capa de datos. Cada archivo define un esquema de Mongoose y las operaciones
sobre la base de datos (CRUD). No contiene lógica de negocio ni reglas de validación complejas.

- Solo sabe hablar con MongoDB.
- No sabe nada de HTTP (no usa req ni res).

Ejemplo: `reportModel.js` define la estructura de un reporte (título, estado, prioridad, etc.)