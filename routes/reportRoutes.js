const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/roles");

/* todas las rutas requieren autenticación */
router.post("/", requireAuth, reportController.createReport); /* crear - no adherirse o es un reporte original*/
router.get("/", requireAuth, requireRole("admin", "superadmin"), reportController.getAllReports); /* listar todos */
router.get("/me", requireAuth, reportController.getMyReports); /* ver mis reportes */
router.get("/nearby", requireAuth, reportController.getNearbyReports); /* reportes pendientes en un radio x */
router.post("/:id/adherir", requireAuth, reportController.adherirReporte); /* crear reporte adherido */
router.get("/:id", requireAuth, requireRole("admin", "superadmin"), reportController.getReportById); /* ver uno */
router.put("/:id", requireAuth, reportController.updateReport); /* editar */
router.delete("/:id", requireAuth, reportController.deleteReport); /* eliminar */


module.exports = router;