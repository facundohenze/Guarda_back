const userModel = require("../models/userModel");

/* recibe los roles desde routes */
const requireRole = (...roles) => {
    return async (req, res, next) => {
        try {
            /* buscamos el usuario en MongoDB con el clerkUserId que dejó el requireAuth */
            const user = await userModel.findOne({ clerkUserId: req.clerkUserId });

            if (!user) {
                return res.status(404).json({ error: "Usuario no encontrado" });
            }

            /* verificamos si el rol del usuario está entre los roles permitidos */
            /* verifica el rol del usuario encontrado con los que vinieron en los parametros */
            if (!roles.includes(user.role)) {
                return res.status(403).json({ error: "No tenés permisos para acceder a este recurso" });
            }

            /* adjuntamos el usuario con toda su informacion al req para no volver a buscarlo en el controller */
            /* sino tendria que llamar siempre al findOne */
            req.user = user;

            next();
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    };
};

module.exports = requireRole;