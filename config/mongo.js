/* conexion a mongo */

const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        // Usamos la URI del .env
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ MongoDB conectado correctamente");
    } catch (error) {
        console.error("❌ Error al conectar MongoDB:", error.message);
        process.exit(1); // Detiene el servidor si no puede conectarse
    }
};

module.exports = connectDB;