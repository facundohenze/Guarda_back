const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
    {
        /* usuario que creó el reporte (referencia al modelo User) */
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },

        /* categoría del incidente */
        category: {
            type: String,
            enum: ["Calles", "Alumbrado", "Higiene urbana", "Tránsito", "Espacios verdes", "Otro"],
            default: "Otro",
        },

        /* prioridad asignada (puede ser manual o por IA más adelante) */
        priority: {
            type: String,
            enum: ["baja", "media", "alta", "critica"],
            default: "media",
        },

        /* estado del ciclo de vida del reporte */
        status: {
            type: String,
            enum: ["open", "in_progress", "resolved"],
            default: "open",
        },

        /* ubicación geográfica */
        location: {
            lat: {
                type: Number,
                required: true,
            },
            lng: {
                type: Number,
                required: true,
            },
            address: {
                type: String,
                required: true,
                trim: true,
            },
        },

        /* URL de imagen subida a Cloudinary (opcional) */
        imageUrl: {
            type: String,
            default: null,
        },

        /* URLs adicionales de imágenes/videos (opcional) */
        imageUrls: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Report", reportSchema);