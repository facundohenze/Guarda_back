const reportModel = require("../models/reportModel");
const userModel = require("../models/userModel");
const { normalizeReport, analyzeReport, analyzeSimilarReports } = require("./iaService");

/* Crea un nuevo reporte */
const createReport = async (clerkUserId, { title, description, category, location, imageUrls, forzarCreacion }) => {
    const user = await userModel.findOne({ clerkUserId });
    if (!user) throw new Error("Usuario no encontrado en la base de datos");

    // 1. normalizamos título y descripción antes de cualquier análisis
    ({ title, description } = await normalizeReport(title, description));

    if (!forzarCreacion) { /* si viene con true, saltea busqueda */
        // 2. buscamos reportes cercanos en un radio de 50 metros
        const nearbyReports = await getNearbyReports(location.lat, location.lng, 50);

        // 3. mandamos a la IA los reportes cercanos + el nuevo para detectar duplicados y similares
        const { duplicado, similares } = await analyzeSimilarReports(
            { title, description, category, userId: user._id }, /* nuevo */
            nearbyReports /* cernanos */
        );

        // 4. si hay duplicado del mismo usuario, avisamos sin guardar
        if (duplicado) {
            return {
                esDuplicado: true,
                reporteExistente: duplicado,
                message: "Ya tenés un reporte similar en esta zona",
            };
        }

        // 5. si hay similares, devolvemos sin guardar para que el usuario decida
        if (similares.length > 0) {
            const similaresTrimmed = similares.map(id => String(id).trim());
            let reportesSimilares = nearbyReports.filter((r) => similaresTrimmed.includes(r._id.toString()));
            // fallback: si el filtro falla por IDs mal formateados, mostramos todos los cercanos
            if (reportesSimilares.length === 0) reportesSimilares = [...nearbyReports];
            return {
                pendiente: true,
                similares: reportesSimilares,
                datosNormalizados: { title, description },
            };
        }
    }

    // 6. analizamos el reporte con IA para obtener severidad, etiquetas y resumen
    const aiAnalysis = await analyzeReport(title, description, category);

    // 7. guardamos el reporte
    const report = await reportModel.create({
        userId: user._id,
        title,
        description,
        category: category || "Otro",
        location,
        imageUrls: imageUrls || [],
        priority: aiAnalysis.severidad,
        aiAnalysis,
        esPrincipal: true,
    });

    return {
        esDuplicado: false,
        report,
        similares: [],
    };
};

/* Devuelve todos los reportes principales (con datos del usuario que lo creó) */
const getAllReports = async () => {
    const reports = await reportModel
        .find({ esPrincipal: true })
        .populate("userId", "nombre email role")
        .sort({ createdAt: -1 });

    return reports;
};

/* Devuelve un reporte por su ID */
const getReportById = async (reportId) => {
    const report = await reportModel
        .findById(reportId)
        .populate("userId", "nombre email role")
        .sort({ createdAt: -1 });

    if (!report) throw new Error("Reporte no encontrado");

    return report;
};

/* reportes del usuario logueado */
const getReportsByUser = async (clerkUserId) => {
    const user = await userModel.findOne({ clerkUserId });
    if (!user) return [];

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

    const isOwner = report.userId.toString() === user._id.toString();
    const isAdmin = ["admin", "superadmin"].includes(user.role);

    if (!isOwner && !isAdmin) {
        throw new Error("No tenés permisos para editar este reporte");
    }

    const allowedFields = isAdmin
        ? ["title", "description", "category", "priority", "status", "imageUrls", "location"]
        : ["title", "description", "category", "imageUrls", "location"];

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

    // si el admin cambió el estado y el reporte es principal
    // actualizamos el estado de todos los reportes adheridos
    if (updates.status && report.esPrincipal && report.adheridos.length > 0) {
        const reporteIds = report.adheridos.map((a) => a.reporteId);
        await reportModel.updateMany(
            { _id: { $in: reporteIds } },
            { $set: { status: updates.status } }
        );
    }

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

/* Devuelve reportes pendientes en un radio dado (en metros) */
const getNearbyReports = async (lat, lng, radius = 50) => {
    // convertimos el radio de metros a grados aproximados
    // 1 grado ≈ 111km, entonces 1 metro ≈ 0.000009 grados
    const radiusInDegrees = radius / 111000;

    const reports = await reportModel.find({
        status: { $in: ["open", "in_progress"] },
        esPrincipal: true,
        "location.lat": { $gte: lat - radiusInDegrees, $lte: lat + radiusInDegrees },
        "location.lng": { $gte: lng - radiusInDegrees, $lte: lng + radiusInDegrees },
    }).populate("userId", "nombre email");

    return reports;
};

/* Adhiere un usuario a un reporte existente */
const adherirReporte = async (clerkUserId, reportePrincipalId, { title, description, imageUrls } = {}) => {
    const user = await userModel.findOne({ clerkUserId });
    if (!user) throw new Error("Usuario no encontrado");

    const reportePrincipal = await reportModel.findById(reportePrincipalId);
    if (!reportePrincipal) throw new Error("Reporte no encontrado");
    if (!reportePrincipal.esPrincipal) throw new Error("Solo podés adherirte a un reporte principal");

    // verificamos que el usuario no esté ya adherido
    const yaAdherido = reportePrincipal.adheridos.some(
        (a) => a.userId.toString() === user._id.toString()
    );
    if (yaAdherido) throw new Error("Ya estás adherido a este reporte");

    // normalizamos solo si el usuario mandó su propio texto
    if (title || description) {
        ({ title, description } = await normalizeReport(
            title || reportePrincipal.title,
            description || reportePrincipal.description
        ));
    }

    // creamos el reporte adherido del usuario
    const reporteAdherido = await reportModel.create({
        userId: user._id,
        title: title || reportePrincipal.title,
        description: description || reportePrincipal.description,
        imageUrls: imageUrls || [],
        category: reportePrincipal.category,
        location: reportePrincipal.location,
        status: reportePrincipal.status,
        priority: reportePrincipal.priority,
        esPrincipal: false,
        reportePrincipalId: reportePrincipal._id,
        aiAnalysis: reportePrincipal.aiAnalysis,
    });

    // sumamos la adhesión al reporte principal
    reportePrincipal.adhesiones += 1;
    reportePrincipal.adheridos.push({
        userId: user._id,
        reporteId: reporteAdherido._id,
    });

    // recalculamos prioridad según adhesiones
    reportePrincipal.priority = calcularPrioridad(
        reportePrincipal.aiAnalysis?.severidad || reportePrincipal.priority,
        reportePrincipal.adhesiones
    );

    await reportePrincipal.save();

    return { reporteAdherido, reportePrincipal };
};

/* Recalcula la prioridad según severidad inicial + adhesiones */
const calcularPrioridad = (severidadInicial, adhesiones) => {
    const niveles = ["baja", "media", "alta", "critica"];
    const indexActual = niveles.indexOf(severidadInicial);

    let bonus = 0;
    if (adhesiones >= 20) bonus = 2;
    else if (adhesiones >= 10) bonus = 1;

    const nuevoIndex = Math.min(indexActual + bonus, niveles.length - 1);
    return niveles[nuevoIndex];
};

module.exports = { createReport, getAllReports, getReportById, updateReport, deleteReport, getReportsByUser, getNearbyReports, adherirReporte };
