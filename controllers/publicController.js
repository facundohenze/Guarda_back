const publicService = require("../service/publicService");

const getResumen = async (req, res) => {
    try {
        const data = await publicService.getResumen();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getTotalReportes = async (req, res) => {
    try {
        const data = await publicService.getTotalReportes();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getReportesPorEstado = async (req, res) => {
    try {
        const data = await publicService.getReportesPorEstado();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getReportesPorCategoria = async (req, res) => {
    try {
        const data = await publicService.getReportesPorCategoria();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = { getResumen, getTotalReportes, getReportesPorEstado, getReportesPorCategoria };