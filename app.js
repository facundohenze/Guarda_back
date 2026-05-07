require("dotenv").config();
const express = require('express')
const app = express()
const cors = require('cors')
const connectDB = require("./config/mongo");
const authRoutes = require("./routes/authRoutes")

app.use(cors())
connectDB(); /* se conecta al arrancar el servidor */
app.use(express.json())


/* Todas las rutas de auth van bajo /api/auth */
app.use("/api/auth", authRoutes);













app.listen(process.env.PORT, () => {
    console.log(`Servidor corriendo en puerto ${process.env.PORT}`);
});