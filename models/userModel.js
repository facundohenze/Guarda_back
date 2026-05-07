const mongoose = require("mongoose");

/* esquema que define al usuario en BD */

const userSchema = new mongoose.Schema(
    {
        clerkUserId: {
            type: String,
            required: true,
            unique: true,
        },
        nombre: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        /* por defecto los nuevos usuarios son user */
        /* se puede cambiar desde la BD */
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },
    },
    {
        /* fecha automatica */
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema);