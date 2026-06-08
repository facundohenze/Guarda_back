const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");
const requireApiKey = require("../middlewares/requireApiKey");

/* Scope 2 — todas las rutas requieren API key en el header x-api-key */
router.get("/resumen", requireApiKey, publicController.getResumen);               /* todo junto */
router.get("/total", requireApiKey, publicController.getTotalReportes);           /* cantidad total */
router.get("/por-estado", requireApiKey, publicController.getReportesPorEstado);  /* por estado */
router.get("/por-categoria", requireApiKey, publicController.getReportesPorCategoria); /* por categoría */

module.exports = router;