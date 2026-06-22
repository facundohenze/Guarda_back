const { createClerkClient } = require("@clerk/backend");
const { verifyToken } = require("@clerk/backend");
const userModel = require("../models/userModel");

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const requireAuth = async (req, res, next) => {
    /* const token = req.headers.authorization; */
    const token = req.headers.authorization?.split(" ")[1];
    /* console.log("header recibido:", req.headers.authorization); */
    /* console.log("token recibido:", token); ver token*/

    if (!token) {
        return res.status(401).json({ error: 'Token requerido' })
    }

    try {
        /* valida el token con clerk (autentico, vigente y sin manipulacion) */
        /* devuelve datos basicos de la sesion, incluido el clerkUserId */
        const payload = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });

        /* payload.sub accedes al clerkUserId*/
        /* se adhunta todo al req para usarlo en el controller */
        req.clerkUserId = payload.sub;

        /* verificamos que el usuario esté activo en nuestra BD */
        const user = await userModel.findOne({ clerkUserId: payload.sub });
        if (user && !user.isActive) {
            return res.status(403).json({ error: "Cuenta desactivada" });
        }

        req.user = user ?? null;
        next();

    } catch (error) {
        console.log("error de verificacion:", error.message);
        res.status(401).json({ error: "Token inválido" });
    }
}

module.exports = requireAuth;