const reportService = require("../service/reportService");

const createReport = async (req, res) => {
    try {
        const clerkUserId = req.clerkUserId;
        const { title, description, category, location, imageUrls, forzarCreacion } = req.body;

        if (!title || !description || !location?.lat || !location?.lng || !location?.address) {
            return res.status(400).json({ error: "Faltan campos obligatorios: title, description, location (lat, lng, address)" });
        }

        const result = await reportService.createReport(clerkUserId, {
            title,
            description,
            category,
            location,
            imageUrls,
            forzarCreacion,
        });

        if (result.rechazado) return res.status(422).json(result);
        if (result.esDuplicado) return res.status(409).json(result);
        if (result.pendiente) return res.status(200).json(result);
        return res.status(201).json(result);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getAllReports = async (req, res) => {
    try {
        const reports = await reportService.getAllReports();
        return res.status(200).json(reports);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getReportById = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await reportService.getReportById(id);
        return res.status(200).json(report);
    } catch (error) {
        return res.status(404).json({ error: error.message });
    }
};

const getMyReports = async (req, res) => {
    try {
        const clerkUserId = req.clerkUserId;
        const reports = await reportService.getReportsByUser(clerkUserId);
        return res.status(200).json(reports);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const updateReport = async (req, res) => {
    try {
        const { id } = req.params;
        const clerkUserId = req.clerkUserId;
        const updates = req.body;

        const report = await reportService.updateReport(id, clerkUserId, updates);
        return res.status(200).json(report);
    } catch (error) {
        const status = error.message.includes("permisos") ? 403 : 500;
        return res.status(status).json({ error: error.message });
    }
};

const deleteReport = async (req, res) => {
    try {
        const { id } = req.params;
        const clerkUserId = req.clerkUserId;

        const result = await reportService.deleteReport(id, clerkUserId);
        return res.status(200).json(result);
    } catch (error) {
        const status = error.message.includes("permisos") ? 403 : 500;
        return res.status(status).json({ error: error.message });
    }
};


const getNearbyReports = async (req, res) => {
    try {
        const { lat, lng, radius } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ error: "Faltan parámetros lat y lng" });
        }

        const reports = await reportService.getNearbyReports(
            parseFloat(lat),
            parseFloat(lng),
            radius ? parseInt(radius) : 500
        );

        return res.status(200).json(reports);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};








const getCiudadanoMapaData = async (req, res) => {
    try {
        const { lat, lng, radius } = req.query;
        const data = await reportService.getCiudadanoMapaData(
            lat != null ? parseFloat(lat) : null,
            lng != null ? parseFloat(lng) : null,
            radius ? parseInt(radius) : 1000
        );
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getHeatmapData = async (req, res) => {
    try {
        const data = await reportService.getHeatmapData();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getReportHistorial = async (req, res) => {
    try {
        const clerkUserId = req.clerkUserId;
        const user = await require("../models/userModel").findOne({ clerkUserId });
        if (!user) return res.status(401).json({ error: "Usuario no encontrado" });

        const isAdmin = ["admin", "superadmin"].includes(user.role);
        const { historial, report } = await reportService.getReportHistorial(req.params.id);

        // ciudadano solo puede ver historial de sus propios reportes
        if (!isAdmin && report.userId.toString() !== user._id.toString()) {
            return res.status(403).json({ error: "No tenés permiso para ver este historial" });
        }

        if (isAdmin) {
            return res.status(200).json(historial);
        }

        // versión simplificada para ciudadanos
        const historialSimplificado = historial.map((entry) => ({
            estadoAnterior: entry.estadoAnterior,
            estadoNuevo: entry.estadoNuevo,
            fecha: entry.createdAt.toLocaleString("es-AR", {
                day: "numeric", month: "long", year: "numeric",
                hour: "2-digit", minute: "2-digit",
            }),
            comentario: entry.comentario,
        }));

        return res.status(200).json(historialSimplificado);
    } catch (error) {
        const status = error.message === "Reporte no encontrado" ? 404 : 500;
        return res.status(status).json({ error: error.message });
    }
};

const adherirReporte = async (req, res) => {
    try {
        const clerkUserId = req.clerkUserId;
        const { id } = req.params;
        const { title, description, imageUrls } = req.body;

        const result = await reportService.adherirReporte(clerkUserId, id, { title, description, imageUrls });
        return res.status(201).json(result);
    } catch (error) {
        const status = error.message.includes("ya estás") ? 409 : 500;
        return res.status(status).json({ error: error.message });
    }
};



module.exports = { createReport, getAllReports, getReportById, updateReport, deleteReport, getMyReports, getNearbyReports, adherirReporte, getReportHistorial, getHeatmapData, getCiudadanoMapaData };