const express = require('express');
const router = express.Router();
const userController = require("../controllers/userController")
const requireAuth = require("../middlewares/requireAuth")

router.post("/sync", requireAuth, userController.syncUser)

module.exports = router;



