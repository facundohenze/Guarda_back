require("dotenv").config();
const express = require('express')
const app = express()
const cors = require('cors')
const connectDB = require("./config/mongo");

app.use(cors())
connectDB(); /* se conecta al arrancar el servidor */
app.use(express.json())
















app.listen(process.env.PORT, () => {
    console.log(`Servidor corriendo en puerto ${process.env.PORT}`);
});