const { createClerkClient } = require("@clerk/backend");

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const requireAuth = async (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Token requerido' })
    }

    try {
        /* verifica el token con clerk */
        const payload = await clerk.verifyToken(token);

        /* payload.sub contiene el clerkUserId, ej: "user_2abc123" */
        /* payload es un objeto que contiene la info del usuario y sub
        es un campo dentro que contiene el ID del usuario */
        req.clerkUserId = payload.sub;
        next();

    } catch {
        res.status(401).json({ error: "Token inválido" });
    }
}

module.exports = requireAuth;