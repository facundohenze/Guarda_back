const reportService = require("../service/reportService");

const createReport = async (req, res) => {
    try {
        const clerkUserId = req.clerkUserId;
        const { title, description, category, location, imageUrls } = req.body;

        if (!title || !description || !location?.lat || !location?.lng || !location?.address) {
            return res.status(400).json({ error: "Faltan campos obligatorios: title, description, location (lat, lng, address)" });
        }

        const result = await reportService.createReport(clerkUserId, {
            title,
            description,
            category,
            location,
            imageUrls,
        });

        // si es duplicado devolvemos 409 (conflicto)
        if (result.esDuplicado) {
            return res.status(409).json(result);
        }

        // si hay similares devolvemos 200 con el reporte y los similares
        // el front decide si el usuario quiere adherirse o no
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








const adherirReporte = async (req, res) => {
    try {
        const clerkUserId = req.clerkUserId;
        const { id } = req.params;

        const result = await reportService.adherirReporte(clerkUserId, id);
        return res.status(201).json(result);
    } catch (error) {
        const status = error.message.includes("ya estás") ? 409 : 500;
        return res.status(status).json({ error: error.message });
    }
};



module.exports = { createReport, getAllReports, getReportById, updateReport, deleteReport, getMyReports, getNearbyReports, adherirReporte };