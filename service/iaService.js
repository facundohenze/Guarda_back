const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
- critica: riesgo inmediato para personas (semáforo apagado, poste caído, inundación grave)
- alta: problema importante que afecta la circulación o servicios básicos
- media: problema visible que requiere atención pronta
- baja: problema menor o estético
`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const parsed = JSON.parse(text);
        return parsed;
    } catch (err) {
        console.warn("[iaService] analyzeReport falló, usando valores por defecto:", err.message);
        return { severidad: "media", etiquetas: [], resumen: "" };
    }
};

/* Analiza reportes cercanos y detecta duplicados y similares */
const analyzeSimilarReports = async (newReport, nearbyReports) => {
    if (nearbyReports.length === 0) return { duplicado: null, similares: [] };

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
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const parsed = JSON.parse(text);
        return parsed;
    } catch (err) {
        console.warn("[iaService] analyzeSimilarReports falló, usando valores por defecto:", err.message);
        return { duplicado: null, similares: [] };
    }
};

module.exports = { analyzeReport, analyzeSimilarReports };