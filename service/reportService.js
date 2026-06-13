const reportModel = require("../models/reportModel");
const userModel = require("../models/userModel");
const { normalizeReport, analyzeReport, analyzeSimilarReports } = require("./iaService");

/* Crea un nuevo reporte */
const createReport = async (clerkUserId, { title, description, category, location, imageUrls }) => {
    const user = await userModel.findOne({ clerkUserId });
    if (!user) throw new Error("Usuario no encontrado en la base de datos");

    // 1. normalizamos título y descripción antes de cualquier análisis
    ({ title, description } = await normalizeReport(title, description));

    // 2. buscamos reportes cercanos en un radio de 50 metros
    const nearbyReports = await getNearbyReports(location.lat, location.lng, 50);
    console.log("[DEBUG] nearbyReports encontrados:", nearbyReports.length, nearbyReports.map(r => ({ id: r._id, title: r.title, userId: r.userId })));

    // 3. mandamos a la IA los reportes cercanos + el nuevo para detectar duplicados y similares
    const { duplicado, similares } = await analyzeSimilarReports(
        { title, description, category, userId: user._id }, /* nuevo */
        nearbyReports /* similares */
    );

    /* SI ES DUPLICADO */
    // 4. si hay duplicado del mismo usuario, avisamos sin guardar
    if (duplicado) {
        return {
            esDuplicado: true,
            reporteExistente: duplicado,
            message: "Ya tenés un reporte similar en esta zona",
        };
    }

    /* SI ES ORIGINAL */
    // 5. analizamos el reporte con IA para obtener severidad, etiquetas y resumen
    const aiAnalysis = await analyzeReport(title, description, category);

    // 6. guardamos el reporte con el análisis de IA
    const report = await reportModel.create({
        userId: user._id,
        title,
        description,
        category: category || "Otro",
        location,
        imageUrls: imageUrls || [],
        priority: aiAnalysis.severidad, // la IA define la prioridad inicial
        aiAnalysis,
        esPrincipal: true,
    });

    /* SI HAY SIMILARES */
    // 7. si hay similares los devolvemos junto al reporte creado
    // para que el front le muestre al usuario la opción de adherirse
    const reportesSimilares = similares.length > 0
        ? nearbyReports.filter((r) => similares.includes(r._id.toString()))
        : [];

    return {
        esDuplicado: false,
        report,
        similares: reportesSimilares,
    };
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
        .populate("userId", "nombre email role")
        .sort({ createdAt: -1 });

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