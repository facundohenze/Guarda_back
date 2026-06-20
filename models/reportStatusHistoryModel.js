// models/reportStatusHistoryModel.js
const mongoose = require("mongoose");

const reportStatusHistorySchema = new mongoose.Schema(
    {
        // reporte al que pertenece este cambio
        reportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Report",
            required: true,
        },

        estadoAnterior: {
            type: String,
            enum: ["open", "in_progress", "resolved"],
            required: true,
        },

        estadoNuevo: {
            type: String,
            enum: ["open", "in_progress", "resolved"],
            required: true,
        },

        // admin que hizo el cambio
        cambiadoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        comentario: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true, // createdAt = fecha del cambio
    }
);

module.exports = mongoose.model("ReportStatusHistory", reportStatusHistorySchema);