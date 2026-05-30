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
        /* por defecto los nuevos usuarios son citizen=ciudadano */
        /* se puede cambiar desde la BD */
        role: {
            type: String,
            enum: ["citizen", "admin", "superadmin"],
            default: "citizen",
        },
        /* soft delete — no se elimina el documento, se desactiva */
        isActive: {
            type: Boolean,
            default: true,
        },
        deletedAt: {
            type: Date,
            default: null,
        },

    },



    {
        /* fecha automatica */
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema); 