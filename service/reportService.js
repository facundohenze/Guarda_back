const reportModel = require("../models/reportModel");
const userModel = require("../models/userModel");

/* Crea un nuevo reporte */
const createReport = async (clerkUserId, { title, description, category, location, imageUrl }) => {
    /* buscamos el usuario en nuestra BD con el clerkUserId */
    const user = await userModel.findOne({ clerkUserId });
    if (!user) throw new Error("Usuario no encontrado en la base de datos");

    const report = await reportModel.create({
        userId: user._id,
        title,
        description,
        category: category || "otro",
        location,
        imageUrl: imageUrl || null,
    });

    return report;
};

/* Devuelve todos los reportes (con datos del usuario que lo creó) */
const getAllReports = async () => {
    const reports = await reportModel
        .find()
        .populate("userId", "nombre email role")
        .sort({ createdAt: -1 });

    return reports;
};

/* Devuelve un reporte por su ID */
const getReportById = async (reportId) => {
    const report = await reportModel
        .findById(reportId)
        .populate("userId", "nombre email role");

    if (!report) throw new Error("Reporte no encontrado");

    return report;
};

/* reportes del usuario logueado */
const getReportsByUser = async (clerkUserId) => {
    const user = await userModel.findOne({ clerkUserId });
    if (!user) throw new Error("Usuario no encontrado en la base de datos");

    const reports = await reportModel
        .find({ userId: user._id })
        .populate("userId", "nombre email role")
        .sort({ createdAt: -1 });

    return reports;
};

/* Actualiza el estado o prioridad de un reporte */
const updateReport = async (reportId, clerkUserId, updates) => {
    const user = await userModel.findOne({ clerkUserId });
    if (!user) throw new Error("Usuario no encontrado");

    const report = await reportModel.findById(reportId);
    if (!report) throw new Error("Reporte no encontrado");

    /* solo el dueño del reporte o un admin pueden editar */
    const isOwner = report.userId.toString() === user._id.toString();
    const isAdmin = user.role === "admin" || user.role === "superadmin";

    if (!isOwner && !isAdmin) {
        throw new Error("No tenés permisos para editar este reporte");
    }

    /* campos que se permiten actualizar por rol*/
    const allowedFields = isAdmin
        ? ["title", "description", "category", "priority", "status", "imageUrl", "location"] /* admins */
        : ["title", "description", "category", "imageUrl", "location"]; /* user */

    /* verificar para actualizar ubicacion */
    if (updates.location) {
        const { lat, lng, address } = updates.location;
        if (lat === undefined || lng === undefined || !address) {
            throw new Error("location debe incluir lat, lng y address");
        }
    }

    allowedFields.forEach((field) => {
        if (updates[field] !== undefined) {
            report[field] = updates[field];
        }
    });

    await report.save();
    return report;
};

/* Elimina un reporte */
const deleteReport = async (reportId, clerkUserId) => {
    const user = await userModel.findOne({ clerkUserId });
    if (!user) throw new Error("Usuario no encontrado");

    const report = await reportModel.findById(reportId);
    if (!report) throw new Error("Reporte no encontrado");

    const isOwner = report.userId.toString() === user._id.toString();
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
        throw new Error("No tenés permisos para eliminar este reporte");
    }

    await reportModel.findByIdAndDelete(reportId);
    return { message: "Reporte eliminado correctamente" };
};

module.exports = { createReport, getAllReports, getReportById, updateReport, deleteReport, getReportsByUser };