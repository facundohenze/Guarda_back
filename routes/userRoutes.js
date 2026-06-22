const express = require('express');
const router = express.Router();
const userController = require("../controllers/userController")
const requireAuth = require("../middlewares/requireAuth")
const requireRole = require("../middlewares/roles");

router.post("/create-admin", requireAuth, requireRole("superadmin"), userController.createAdmin) /* crear admin */
router.get("/", requireAuth, requireRole("superadmin"), userController.getAllUsers) /* todos */
router.get("/:id", requireAuth, requireRole("superadmin"), userController.getUsersById) /* ver uno */
router.put("/:id", requireAuth, userController.updateUser) /* editar — autorización validada en el servicio */
router.delete("/:id", requireAuth, requireRole("superadmin"), userController.deleteUser) /* eliminar */

module.exports = router;
