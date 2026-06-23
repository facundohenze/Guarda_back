const { GoogleGenAI } = require("@google/genai");

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const genAI2 = process.env.GEMINI_API_KEY_2
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_2 })
    : null;

const callModel = (client, prompt) => client.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
    config: { temperature: 0.1 },
});

const generateContent = async (prompt) => {
    try {
        return await callModel(genAI, prompt);
    } catch (err) {
        const msg = String(err?.message ?? '');
        const isRateLimited = err?.status === 429 || msg.includes('429') || msg.toLowerCase().includes('quota');
        if (isRateLimited && genAI2) {
            console.warn('[iaService] API key principal sin cuota, usando respaldo…');
            return await callModel(genAI2, prompt);
        }
        throw err;
    }
};

const parseJSON = (text) => {
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : text);
};

/* Reintentos con backoff exponencial — solo para errores de sobrecarga (503) */
const withRetry = async (fn, { retries = 4, baseDelay = 1000, label = 'ia' } = {}) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            const msg = String(err?.message ?? '');
            const isRateLimited = err?.status === 429 || msg.includes('429') || msg.toLowerCase().includes('quota');
            const isOverloaded = err?.status === 503 || msg.includes('503') || msg.toLowerCase().includes('overload');

            if (isRateLimited) throw err; // falla rápido, no tiene sentido reintentar
            if (!isOverloaded || attempt === retries) throw err;

            const delay = baseDelay * Math.pow(2, attempt);
            console.warn(`[iaService:${label}] Intento ${attempt + 1} fallido (sobrecarga), reintentando en ${delay}ms…`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
};
/* Analiza un reporte nuevo y devuelve severidad, etiquetas y resumen.
   Reintenta hasta 4 veces con backoff exponencial si Gemini está saturado.
   Si todos los reintentos fallan, propaga el error (el reporte NO se crea). */
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
  "etiquetas2": [],
  "resumen": "una oración descriptiva del incidente"
}

Criterios para etiquetas2 — solo agregá las que apliquen, puede ser vacío:
- "impacto_circulacion": el problema afecta directamente cómo se mueven las personas o vehículos por la ciudad (bache, árbol caído en la vía, semáforo roto, corte de calle, obra sin señalización, vereda rota con riesgo de caída, etc.)
- "impacto_seguridad": el problema representa un riesgo para la integridad de las personas (alumbrado apagado, poste caído, zona sin iluminación, cables sueltos, etc.)
Si el reporte es puramente estético o no afecta la circulación ni la seguridad (pasto alto, pinturas deterioradas, cantero descuidado, etc.), dejá etiquetas2 vacío.

Criterios de severidad:
- critica: riesgo inmediato para personas (accidente de tránsito, choque de vehículos, heridos, semáforo apagado en cruce, poste caído, inundación grave, incendio, gas, etc)
- alta: problema importante que afecta la circulación o servicios básicos (bache profundo en arteria principal, árbol caído en la vía, corte de luz en zona amplia, pérdida de agua, etc)
- media: problema visible que requiere atención pronta (bache en calle secundaria, luminaria apagada, basura acumulada, grafitis en edificio público, etc)
- baja: problema menor o estético (vereda levantada sin riesgo, pintura deteriorada, pasto alto, etc)
`;

    const run = async () => {
        const result = await generateContent(prompt);
        const parsed = parseJSON(result.text);

        if (!["baja", "media", "alta", "critica"].includes(parsed.severidad)) parsed.severidad = "media";
        if (!Array.isArray(parsed.etiquetas)) parsed.etiquetas = [];
        if (!Array.isArray(parsed.etiquetas2)) parsed.etiquetas2 = [];
        if (typeof parsed.resumen !== "string") parsed.resumen = "";

        return parsed;
    };

    try {
        return await withRetry(run, { retries: 4, baseDelay: 1000, label: 'analyzeReport' });
    } catch (err) {
        console.error("[iaService] analyzeReport agotó todos los reintentos:", err.message);
        throw new Error("El análisis de IA no está disponible en este momento. Por favor intentá de nuevo en unos segundos.");
    }
};

/* Analiza reportes cercanos y detecta duplicados y similares */
const analyzeSimilarReports = async (newReport, nearbyReports) => {
    if (nearbyReports.length === 0) return { duplicado: null, similares: [] };
    const reportsToAnalyze = nearbyReports
        .slice(0, 10)
        .map(r => ({
            id: r._id.toString(),
            title: r.title,
            description: r.description,
            category: r.category,
            userId: r.userId._id?.toString() || r.userId.toString(),
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
- UsuarioId: ${newReport.userId.toString()}

Reportes cercanos:
${reportsToAnalyze.map((r, i) => `
[${i}] ID: ${r.id}
- Título: ${r.title}
- Descripción: ${r.description}
- Categoría: ${r.category}
- UsuarioId: ${r.userId}
`).join('\n')}

Devolvé exactamente este formato JSON:
{
  "duplicado": "id_del_reporte" | null,
  "similares": ["id1", "id2"]
}

Criterios:
- duplicado: incidente similar, mismo usuario, misma categoría o similar, descripción y título similar
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

/* Valida si un reporte es legítimo o parece inventado, spam o fuera de lugar */
const validateReport = async (title, description, category) => {
    const prompt = `
Sos un asistente municipal que valida reportes ciudadanos en Villa María, Argentina.
Analizá si el siguiente reporte es legítimo o si parece inventado, exagerado, spam o inapropiado.
Devolvé ÚNICAMENTE un JSON válido, sin texto adicional, sin bloques de código, sin explicaciones.

Reporte:
- Título: ${title}
- Descripción: ${description}
- Categoría: ${category}

Devolvé exactamente este formato JSON:
{
  "valido": true | false,
  "razon": "explicación breve y amable si es inválido, o cadena vacía si es válido"
}

Criterios para marcar como INVÁLIDO (valido: false):
- Spam o prueba: texto sin sentido, caracteres aleatorios, o palabras como "test", "prueba", "hola", "asdf", etc.
- Imposible o ficticio: eventos que no pueden ocurrir en la realidad urbana (invasión alienígena, terremoto, tsunami, etc.)
- Exagerado hasta lo absurdo: describe catástrofes mundiales o apocalípticas por un incidente menor
- Sin relación con incidentes urbanos: contenido político, publicitario, personal, chistes o memes
- Ofensivo o inapropiado: insultos, contenido discriminatorio o sexual
- Emergencia que requiere servicios de urgencia: si el reporte describe una situación que requiere atención inmediata de bomberos, policía o ambulancia (incendio activo, accidente con heridos, robo en curso, persona inconsciente, personas con comportamientos extraños, personas deambulando, pelea con violencia, etc.), marcarlo como inválido e indicar en "razon" a qué número llamar. Usá este formato exacto en "razon": "Esta situación requiere atención inmediata. Llamá al [número]: [servicio]." donde [número] y [servicio] son uno de estos: 100 - Bomberos, 101 - Policía, 107 - SAME / Ambulancia. Si aplica más de uno, mencioná todos.

Criterios para marcar como VÁLIDO (valido: true):
- Cualquier problema real de infraestructura o servicios urbanos: bache, basura, luminaria, semáforo, ruidos, obras, etc.
- Situaciones resueltas que dejaron daño (hubo un incendio y quedó daño en la vía pública, ya no hay heridos pero hay un poste caído, etc.)
- Aunque el redactado sea informal o con errores ortográficos
- Aunque la severidad sea baja o el problema sea menor
- En caso de duda, marcar como válido
`;

    const run = async () => {
        const result = await generateContent(prompt);
        const parsed = parseJSON(result.text);
        if (typeof parsed.valido !== "boolean") return { valido: true, razon: "" };
        return { valido: parsed.valido, razon: parsed.razon ?? "" };
    };

    try {
        return await withRetry(run, { retries: 4, baseDelay: 1000, label: 'validateReport' });
    } catch (err) {
        console.warn("[iaService] validateReport agotó reintentos, permitiendo el reporte:", err.message);
        return { valido: true, razon: "" };
    }
};

/* Normaliza título y descripción: corrige ortografía, gramática y redacción */
const normalizeReport = async (title, description) => {
    const prompt = `
Sos un asistente que corrige reportes ciudadanos en español rioplatense.
Corregí la ortografía, gramática y redacción del título y la descripción.
No cambies el significado ni agregues información que no esté.
Devolvé ÚNICAMENTE un JSON válido, sin texto adicional, sin bloques de código.

Título original: ${title}
Descripción original: ${description}

Devolvé exactamente este formato JSON:
{
  "title": "título corregido",
  "description": "descripción corregida"
}
`;

    try {
        const result = await generateContent(prompt);
        const parsed = parseJSON(result.text);
        if (typeof parsed.title !== "string" || typeof parsed.description !== "string") {
            throw new Error("Formato inválido");
        }
        return parsed;
    } catch (err) {
        console.warn("[iaService] normalizeReport falló, usando valores originales:", err.message);
        return { title, description };
    }
};

module.exports = { normalizeReport, analyzeReport, analyzeSimilarReports, validateReport };