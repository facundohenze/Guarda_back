const reportService = require("../service/reportService");

const createReport = async (req, res) => {
    try {
        const clerkUserId = req.clerkUserId;
        const { title, description, category, location, imageUrl } = req.body;

        if (!title || !description || !location?.lat || !location?.lng || !location?.address) {
            return res.status(400).json({ error: "Faltan campos obligatorios: title, description, location (lat, lng, address)" });
        }

        const report = await reportService.createReport(clerkUserId, {
            title,
            description,
            category,
            location,
            imageUrl,
        });

        return res.status(201).json(report);
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

module.exports = { createReport, getAllReports, getReportById, updateReport, deleteReport, getMyReports };