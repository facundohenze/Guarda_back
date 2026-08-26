const reportModel = require("../models/reportModel");
const userModel = require("../models/userModel");

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

const getUsuarios = async () => {
    const usuarios = await userModel.find({}).select('-__v -clerkUserId -email -nombre').lean();
    return usuarios.map(u => ({
        id: u._id,
        rol: u.role,
        activo: u.isActive,
        creadoEn: u.createdAt,
    }));
};

module.exports = { getUsuarios, getTotalReportes, getReportesPorEstado, getReportesPorCategoria, getResumen };