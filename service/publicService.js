const reportModel = require("../models/reportModel");
const userModel = require("../models/userModel");
const reportStatusHistoryModel = require("../models/reportStatusHistoryModel");

/* Total de reportes */
const getTotalReportes = async () => {
    const total = await reportModel.countDocuments();
    return { total };
};

/* Reportes agrupados por estado */
const getReportesPorEstado = async () => {
    const resultado = await reportModel.aggregate([
        {
            $group: {
                _id: "$status",
                cantidad: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    /* formatear para que sea más legible */
    const labels = { open: "Pendiente", in_progress: "En revisión", resolved: "Resuelto" };
    return resultado.map(r => ({
        estado: r._id,
        label: labels[r._id] || r._id,
        cantidad: r.cantidad
    }));
};

/* Reportes agrupados por categoría */
const getReportesPorCategoria = async () => {
    const resultado = await reportModel.aggregate([
        {
            $group: {
                _id: "$category",
                cantidad: { $sum: 1 }
            }
        },
        { $sort: { cantidad: -1 } }
    ]);

    return resultado.map(r => ({
        categoria: r._id,
        cantidad: r.cantidad
    }));
};

/* Resumen general — todo junto en un solo endpoint */
const getResumen = async () => {
    const [total, porEstado, porCategoria] = await Promise.all([
        getTotalReportes(),
        getReportesPorEstado(),
        getReportesPorCategoria(),
    ]);

    return {
        total: total.total,
        porEstado,
        porCategoria,
    };
};

/* FACT_reportes — 1 fila = 1 acto de reporte (original o adhesión) */
const getReportes = async () => {
    const reportes = await reportModel.find({}).select('-__v').lean();
    return reportes.map(r => ({
        id: r._id,
        userId: r.userId,
        titulo: r.title,
        categoria: r.category,
        estado: r.status,
        prioridad: r.priority,
        lat: r.location?.lat,
        lng: r.location?.lng,
        barrio: r.location?.barrio,
        severidad: r.aiAnalysis?.severidad,
        esPrincipal: r.esPrincipal,
        reportePrincipalId: r.reportePrincipalId ?? null,
        adhesiones: r.adhesiones,
        creadoEn: r.createdAt,
        actualizadoEn: r.updatedAt,
    }));
};


const getUsuarios = async () => {
    const usuarios = await userModel.find({}).select('-__v -clerkUserId -email -nombre').lean();
    return usuarios.map(u => ({
        id: u._id,
        rol: u.role,
        activo: u.isActive,
        desactivadoEn: u.deletedAt ?? null,
        creadoEn: u.createdAt
    }));
};

/* FACT_historial_estados — cada fila es un cambio de estado de un reporte */
const getHistorialEstados = async () => {
    const historial = await reportStatusHistoryModel.find({}).select('-__v -comentario -updatedAt').lean();
    return historial.map(h => ({
        id: h._id,
        reportId: h.reportId,
        estadoAnterior: h.estadoAnterior,
        estadoNuevo: h.estadoNuevo,
        cambiadoPor: h.cambiadoPor,
        creadoEn: h.createdAt,
    }));
};

module.exports = { getReportes, getHistorialEstados, getUsuarios, getTotalReportes, getReportesPorEstado, getReportesPorCategoria, getResumen };
