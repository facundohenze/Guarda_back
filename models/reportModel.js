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
            default: "otro",
        },

        /* prioridad asignada (puede ser manual o por IA más adelante) */
        priority: {
            type: String,
            enum: ["baja", "media", "alta", "critica"],
            default: "baja",
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
            barrio: {
                type: String,
                trim: true,
                default: null,
            },
        },

        /* URL de imagen subida a Cloudinary (opcional) */
        imageUrls: {
            type: [String],
            default: [],
        },

        /* ----------------------------------------------------------------- */


        /* SISTEMA DE ADHESIONES */

        // true si es el reporte original, false si es adherido
        esPrincipal: {
            type: Boolean,
            default: true,
        },

        // referencia al reporte principal (solo para reportes adheridos)
        reportePrincipalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Report",
            default: null,
        },

        // cantidad de adhesiones (para calcular prioridad)
        adhesiones: {
            type: Number,
            default: 0,
        },

        // array de usuarios que se adhirieron y su reporte adherido
        adheridos: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                reporteId: { type: mongoose.Schema.Types.ObjectId, ref: "Report" },
            },
        ],

        /* ----------------------------------------------------------------- */
        /* ANALISIS DE LA IA */

        aiAnalysis: {
            severidad: {
                type: String,
                enum: ["baja", "media", "alta", "critica"],
                default: null,
            },
            etiquetas: {
                type: [String],
                default: [],
            },
            etiquetas2: {
                type: [String],
                default: [],
            },
            resumen: {
                type: String,
                default: null,
            },
        },

    },






    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Report", reportSchema);