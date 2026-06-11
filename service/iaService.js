const { GoogleGenAI } = require("@google/genai");

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateContent = (prompt) => genAI.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
    config: { temperature: 0.1 },
});

const parseJSON = (text) => {
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : text);
};
/* Analiza un reporte nuevo y devuelve severidad, etiquetas y resumen */
const analyzeReport = async (title, description, category) => {
    const prompt = `
Sos un asistente municipal que analiza reportes de incidentes urbanos en Villa María, Argentina.
Analizá el siguiente reporte y devolvé ÚNICAMENTE un JSON válido, sin texto adicional, sin bloques de código, sin explicaciones.

Reporte:
- Título: ${title}
- Descripción: ${description}
- Categoría: ${category}

Devolvé exactamente este formato JSON:
{
  "severidad": "baja" | "media" | "alta" | "critica",
  "etiquetas": ["etiqueta1", "etiqueta2"],
  "resumen": "una oración descriptiva del incidente"
}

Criterios de severidad:
- critica: riesgo inmediato para personas (accidente de tránsito, choque de vehículos, heridos, semáforo apagado en cruce, poste caído, inundación grave, incendio, gas, etc)
- alta: problema importante que afecta la circulación o servicios básicos (bache profundo en arteria principal, árbol caído en la vía, corte de luz en zona amplia, pérdida de agua, etc)
- media: problema visible que requiere atención pronta (bache en calle secundaria, luminaria apagada, basura acumulada, grafitis en edificio público, etc)
- baja: problema menor o estético (vereda levantada sin riesgo, pintura deteriorada, pasto alto, etc)
`;

    try {
        const result = await generateContent(prompt);
        const parsed = parseJSON(result.text);
        const validPriorities = [
            "baja",
            "media",
            "alta",
            "critica"
        ];

        if (!validPriorities.includes(parsed.severidad)) {
            parsed.severidad = "media";
        }

        if (!Array.isArray(parsed.etiquetas)) {
            parsed.etiquetas = [];
        }

        if (typeof parsed.resumen !== "string") {
            parsed.resumen = "";
        }
        return parsed;
    } catch (err) {
        console.warn("[iaService] analyzeReport falló, usando valores por defecto:", err.message);
        return { severidad: "media", etiquetas: [], resumen: "" };
    }
};

/* Analiza reportes cercanos y detecta duplicados y similares */
const analyzeSimilarReports = async (newReport, nearbyReports) => {
    if (nearbyReports.length === 0) return { duplicado: null, similares: [] };
    const reportsToAnalyze = nearbyReports
        .slice(0, 10)
        .map(r => ({
            id: r._id,
            title: r.title,
            description: r.description,
            category: r.category
        }));
    const prompt = `
Sos un asistente municipal que analiza reportes de incidentes urbanos.
Se está creando un reporte nuevo y hay reportes cercanos en la zona.
Analizá si alguno es duplicado o similar al nuevo reporte.
Devolvé ÚNICAMENTE un JSON válido, sin texto adicional, sin bloques de código, sin explicaciones.

Reporte nuevo:
- Título: ${newReport.title}
- Descripción: ${newReport.description}
- Categoría: ${newReport.category}

Reportes cercanos:
${nearbyReports.map((r, i) => `
[${i}] ID: ${r._id}
- Título: ${r.title}
- Descripción: ${r.description}
- Categoría: ${r.category}
- Usuario: ${r.userId}
`).join('\n')}

Devolvé exactamente este formato JSON:
{
  "duplicado": "id_del_reporte" | null,
  "similares": ["id1", "id2"]
}

Criterios:
- duplicado: mismo incidente, mismo usuario, misma categoría y descripción muy similar
- similares: mismo tipo de incidente en la zona aunque sea de otro usuario (no incluir el duplicado)
- Si no hay duplicado, "duplicado" debe ser null
- Si no hay similares, "similares" debe ser array vacío
`;

    try {
        const result = await generateContent(prompt);
        const parsed = parseJSON(result.text);
        return parsed;
    } catch (err) {
        console.warn("[iaService] analyzeSimilarReports falló, usando detección rule-based:", err.message);
        return detectDuplicatesRuleBased(newReport, nearbyReports);
    }
};

/* Fallback sin IA: mismo usuario + misma categoría en la zona = duplicado */
const detectDuplicatesRuleBased = (newReport, nearbyReports) => {
    const duplicadoReport = nearbyReports.find(r =>
        r.userId._id.toString() === newReport.userId.toString() &&
        r.title.toLowerCase() === newReport.title.toLowerCase() &&
        r.category === newReport.category
    );

    const similares = nearbyReports
        .filter(r =>
            r.category === newReport.category &&
            (!duplicadoReport || r._id.toString() !== duplicadoReport._id.toString())
        )
        .map(r => r._id.toString());

    return {
        duplicado: duplicadoReport ? duplicadoReport._id.toString() : null,
        similares,
    };
};

module.exports = { analyzeReport, analyzeSimilarReports };