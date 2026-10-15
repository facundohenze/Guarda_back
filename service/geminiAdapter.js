/* ADAPTER de Gemini.
   Es el único lugar del sistema que sabe cómo habla la librería @google/genai:
   - recibe un prompt y devuelve un objeto JS ya parseado (Gemini devuelve texto libre en result.text)
   - traduce los errores de Gemini (status 429/503 o mensajes sueltos) a nuestros tipos:
     "sin_cuota" | "sobrecarga" | "otro"
   Si mañana cambiamos de proveedor de IA, se reescribe solo este archivo. */
const { GoogleGenAI } = require("@google/genai");

const MODELO = "gemini-3.1-flash-lite";

const clientePrincipal = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const clienteRespaldo = process.env.GEMINI_API_KEY_2
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_2 })
    : null;

/* Error con el vocabulario de nuestro sistema */
class IAError extends Error {
    constructor(tipo, mensaje) {
        super(mensaje);
        this.tipo = tipo;
    }
}

const clasificarError = (err) => {
    const msg = String(err?.message ?? '');
    if (err?.status === 429 || msg.includes('429') || msg.toLowerCase().includes('quota')) return "sin_cuota";
    if (err?.status === 503 || msg.includes('503') || msg.toLowerCase().includes('overload')) return "sobrecarga";
    return "otro";
};

const llamarModelo = (cliente, prompt) => cliente.models.generateContent({
    model: MODELO,
    contents: prompt,
    config: { temperature: 0.1 },
});

/* Gemini a veces envuelve el JSON en texto o bloques de código: nos quedamos con el objeto */
const extraerJSON = (texto) => {
    const match = texto.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : texto);
};

/* Contrato que usa el resto del sistema: prompt -> objeto */
const pedirJSON = async (prompt) => {
    let result;
    try {
        result = await llamarModelo(clientePrincipal, prompt);
    } catch (err) {
        const tipo = clasificarError(err);
        if (tipo === "sin_cuota" && clienteRespaldo) {
            console.warn('[geminiAdapter] API key principal sin cuota, usando respaldo…');
            try {
                result = await llamarModelo(clienteRespaldo, prompt);
            } catch (err2) {
                throw new IAError(clasificarError(err2), err2.message);
            }
        } else {
            throw new IAError(tipo, err.message);
        }
    }
    return extraerJSON(result.text);
};

module.exports = { pedirJSON, IAError };
