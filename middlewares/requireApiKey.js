/* Middleware para el Scope 2 — verifica la API key en el header x-api-key */
const requireApiKey = (req, res, next) => {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
        return res.status(401).json({ error: "API key requerida" });
    }

    if (apiKey !== process.env.PUBLIC_API_KEY) {
        return res.status(403).json({ error: "API key inválida" });
    }

    next();
};

module.exports = requireApiKey;