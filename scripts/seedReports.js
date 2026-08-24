/*
 * Script de carga de datos (seed) para el TP de Análisis de Datos (Power BI/Looker).
 * Genera usuarios y reportes fabricados directo en MongoDB, sin pasar por la IA
 * (para no gastar cuota de Gemini ni depender de que el server esté levantado).
 *
 * Uso:
 *   node scripts/seedReports.js            -> agrega ~1000 documentos de reportes
 *   node scripts/seedReports.js --count=2000
 *   node scripts/seedReports.js --reset    -> borra los datos fabricados por este script antes de insertar
 *
 * Los documentos fabricados se marcan con _seed: true para poder identificarlos/limpiarlos después.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const userModel = require("../models/userModel");
const reportModel = require("../models/reportModel");
const ReportStatusHistory = require("../models/reportStatusHistoryModel");

const args = process.argv.slice(2);
const RESET = args.includes("--reset");
const countArg = args.find((a) => a.startsWith("--count="));
const TARGET = countArg ? parseInt(countArg.split("=")[1], 10) : 1000;

const CATEGORIAS = ["Calles", "Alumbrado", "Higiene urbana", "Tránsito", "Espacios verdes", "Otro"];
const NIVELES = ["baja", "media", "alta", "critica"];
const BARRIOS = [
    "Centro", "Ameghino", "Estación", "Roque Sáenz Peña",
    "Carlos Pellegrini", "Boedo", "San Martín", "Las Playas", "Villa Alicia", "Ciudad de América",
];

// coordenadas base: Villa María, Córdoba, Argentina (contexto usado en los prompts de iaService)
const BASE_LAT = -32.4103;
const BASE_LNG = -63.2406;

const TITULOS_POR_CATEGORIA = {
    "Calles": ["Bache en {addr}", "Pozo profundo en {addr}", "Pavimento roto en {addr}", "Calle hundida en {addr}"],
    "Alumbrado": ["Luminaria apagada en {addr}", "Poste caído en {addr}", "Zona sin iluminación en {addr}"],
    "Higiene urbana": ["Basura acumulada en {addr}", "Contenedor desbordado en {addr}", "Olores fuertes en {addr}"],
    "Tránsito": ["Semáforo roto en {addr}", "Cruce peligroso en {addr}", "Falta señalización en {addr}"],
    "Espacios verdes": ["Plaza descuidada en {addr}", "Árbol caído en {addr}", "Pasto muy alto en {addr}"],
    "Otro": ["Problema urbano en {addr}", "Reclamo vecinal en {addr}"],
};

const ETIQUETAS_POR_CATEGORIA = {
    "Calles": ["bache", "vía pública", "pavimento roto"],
    "Alumbrado": ["luminaria apagada", "poste caído", "cableado suelto"],
    "Higiene urbana": ["basura acumulada", "contenedor desbordado", "olores"],
    "Tránsito": ["semáforo roto", "señalización faltante", "cruce peligroso"],
    "Espacios verdes": ["pasto alto", "árbol caído", "plaza descuidada"],
    "Otro": ["incidente urbano", "reclamo vecinal"],
};

/* mismo criterio que el prompt de analyzeReport en iaService.js:
   impacto_circulacion -> afecta cómo se mueven personas/vehículos
   impacto_seguridad -> riesgo para la integridad de las personas
   etiquetas puramente estéticas (pasto alto, plaza descuidada, etc.) no llevan ninguna */
const IMPACTO_POR_ETIQUETA = {
    "bache": ["impacto_circulacion"],
    "vía pública": ["impacto_circulacion"],
    "pavimento roto": ["impacto_circulacion"],
    "luminaria apagada": ["impacto_seguridad"],
    "poste caído": ["impacto_seguridad", "impacto_circulacion"],
    "cableado suelto": ["impacto_seguridad"],
    "basura acumulada": [],
    "contenedor desbordado": [],
    "olores": [],
    "semáforo roto": ["impacto_circulacion", "impacto_seguridad"],
    "señalización faltante": ["impacto_circulacion"],
    "cruce peligroso": ["impacto_circulacion", "impacto_seguridad"],
    "pasto alto": [],
    "árbol caído": ["impacto_circulacion"],
    "plaza descuidada": [],
    "incidente urbano": [],
    "reclamo vecinal": [],
};

const calcularEtiquetas2 = (etiquetas) => {
    const set = new Set();
    for (const etiqueta of etiquetas) {
        for (const impacto of IMPACTO_POR_ETIQUETA[etiqueta] || []) set.add(impacto);
    }
    return [...set];
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/* elige un valor según pesos: [[valor, peso], ...] */
const weightedPick = (pairs) => {
    const total = pairs.reduce((sum, [, w]) => sum + w, 0);
    let r = Math.random() * total;
    for (const [value, w] of pairs) {
        if (r < w) return value;
        r -= w;
    }
    return pairs[pairs.length - 1][0];
};

/* misma lógica que reportService.calcularPrioridad — para que quede coherente con el sistema real */
const calcularPrioridad = (severidadInicial, adhesiones) => {
    const indexActual = NIVELES.indexOf(severidadInicial);
    let bonus = 0;
    if (adhesiones >= 20) bonus = 2;
    else if (adhesiones >= 10) bonus = 1;
    return NIVELES[Math.min(indexActual + bonus, NIVELES.length - 1)];
};

const jitterCoord = (base, maxKm = 3) => {
    const deg = maxKm / 111;
    return base + (Math.random() * 2 - 1) * deg;
};

const HOY = new Date("2026-08-24T12:00:00.000Z");

const randomDateInLastMonths = (months = 6) => {
    const past = new Date(HOY);
    past.setMonth(past.getMonth() - months);
    const t = past.getTime() + Math.random() * (HOY.getTime() - past.getTime());
    return new Date(t);
};

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

async function main() {
    if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI en el .env");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Conectado a:", mongoose.connection.name || "(default db)");

    const totalUsersAntes = await userModel.countDocuments();
    const totalReportsAntes = await reportModel.countDocuments();
    console.log(`Estado actual -> usuarios: ${totalUsersAntes}, reportes: ${totalReportsAntes}`);

    if (RESET) {
        const delReports = await reportModel.deleteMany({ _seed: true });
        const delUsers = await userModel.deleteMany({ _seed: true });
        const delHistory = await ReportStatusHistory.deleteMany({ _seed: true });
        console.log(`--reset: eliminados ${delReports.deletedCount} reportes, ${delUsers.deletedCount} usuarios y ${delHistory.deletedCount} entradas de historial fabricados previamente.`);
    }

    // 1. usuarios fabricados (citizens + un puñado de admins para el historial de estados)
    const N_CITIZENS = 200;
    const N_ADMINS = 5;
    const now = new Date();
    const users = [];

    for (let i = 0; i < N_CITIZENS; i++) {
        users.push({
            _id: new mongoose.Types.ObjectId(),
            clerkUserId: `seed_citizen_${String(i).padStart(4, "0")}`,
            nombre: `Vecino Seed ${i}`,
            email: `seed.vecino${i}@example.com`,
            role: "citizen",
            isActive: true,
            deletedAt: null,
            _seed: true,
            createdAt: now,
            updatedAt: now,
        });
    }
    const admins = [];
    for (let i = 0; i < N_ADMINS; i++) {
        const admin = {
            _id: new mongoose.Types.ObjectId(),
            clerkUserId: `seed_admin_${String(i).padStart(4, "0")}`,
            nombre: `Admin Seed ${i}`,
            email: `seed.admin${i}@example.com`,
            role: "admin",
            isActive: true,
            deletedAt: null,
            _seed: true,
            createdAt: now,
            updatedAt: now,
        };
        users.push(admin);
        admins.push(admin);
    }

    await userModel.collection.insertMany(users);
    console.log(`${users.length} usuarios fabricados creados (${N_CITIZENS} citizen, ${N_ADMINS} admin).`);

    // 2. reportes principales + adhesiones, hasta llegar al TARGET de documentos
    const reportDocs = [];
    const historyDocs = [];
    let totalDocs = 0;

    while (totalDocs < TARGET) {
        const category = pick(CATEGORIAS);
        const estado = weightedPick([["open", 0.55], ["in_progress", 0.2], ["resolved", 0.25]]);
        const severidadBase = weightedPick([["baja", 0.35], ["media", 0.35], ["alta", 0.2], ["critica", 0.1]]);
        const createdAt = randomDateInLastMonths(6);
        const creador = pick(users);
        const barrio = pick(BARRIOS);
        const addr = `${pick(["Av.", "Calle", "Bv."])} ${pick(["Italia", "San Martín", "Alvear", "Sarmiento", "Belgrano", "9 de Julio", "Corrientes"])} ${randInt(100, 2500)}`;

        const adhesionesCount = weightedPick([
            [0, 0.4], [1, 0.2], [2, 0.15], [5, 0.1], [10, 0.08], [15, 0.05], [25, 0.02],
        ]);
        const prioridadFinal = calcularPrioridad(severidadBase, adhesionesCount);

        const lat = jitterCoord(BASE_LAT);
        const lng = jitterCoord(BASE_LNG);
        const title = pick(TITULOS_POR_CATEGORIA[category]).replace("{addr}", addr);
        const etiquetas = pickN(ETIQUETAS_POR_CATEGORIA[category], 2);
        const etiquetas2 = calcularEtiquetas2(etiquetas);
        const description = `Vecinos reportan ${title.toLowerCase()}. Se solicita intervención municipal.`;

        // fecha de "resolución" para poder medir tiempos de atención en el TP
        let updatedAt = createdAt;
        if (estado === "in_progress") updatedAt = addDays(createdAt, randInt(1, 15));
        if (estado === "resolved") updatedAt = addDays(createdAt, randInt(2, 30));

        const principalId = new mongoose.Types.ObjectId();
        const location = { lat, lng, address: addr, barrio };
        const aiAnalysis = { severidad: severidadBase, etiquetas, etiquetas2, resumen: `${title}.` };

        const adheridosArr = [];
        const adheridoDocs = [];
        const posiblesAdherentes = users.filter((u) => u._id.toString() !== creador._id.toString());

        for (let j = 0; j < adhesionesCount; j++) {
            const adherente = pick(posiblesAdherentes);
            const adheridoId = new mongoose.Types.ObjectId();
            const adherCreatedAt = addDays(createdAt, randInt(0, 20));

            adheridosArr.push({ userId: adherente._id, reporteId: adheridoId });
            adheridoDocs.push({
                _id: adheridoId,
                userId: adherente._id,
                title,
                description,
                category,
                priority: prioridadFinal,
                status: estado,
                location,
                imageUrls: [],
                esPrincipal: false,
                reportePrincipalId: principalId,
                adhesiones: 0,
                adheridos: [],
                aiAnalysis,
                _seed: true,
                createdAt: adherCreatedAt,
                updatedAt: adherCreatedAt > updatedAt ? adherCreatedAt : updatedAt,
            });
        }

        reportDocs.push(
            {
                _id: principalId,
                userId: creador._id,
                title,
                description,
                category,
                priority: prioridadFinal,
                status: estado,
                location,
                imageUrls: [],
                esPrincipal: true,
                reportePrincipalId: null,
                adhesiones: adhesionesCount,
                adheridos: adheridosArr,
                aiAnalysis,
                _seed: true,
                createdAt,
                updatedAt,
            },
            ...adheridoDocs
        );

        // historial de estados, coherente con el estado final del reporte principal
        if (estado === "in_progress" || estado === "resolved") {
            const fechaEnProgreso = addDays(createdAt, randInt(1, 5));
            historyDocs.push({
                reportId: principalId,
                estadoAnterior: "open",
                estadoNuevo: "in_progress",
                cambiadoPor: pick(admins)._id,
                comentario: null,
                _seed: true,
                createdAt: fechaEnProgreso,
                updatedAt: fechaEnProgreso,
            });
        }
        if (estado === "resolved") {
            historyDocs.push({
                reportId: principalId,
                estadoAnterior: "in_progress",
                estadoNuevo: "resolved",
                cambiadoPor: pick(admins)._id,
                comentario: null,
                _seed: true,
                createdAt: updatedAt,
                updatedAt,
            });
        }

        totalDocs += 1 + adhesionesCount;
    }

    await reportModel.collection.insertMany(reportDocs);
    console.log(`${reportDocs.length} reportes insertados (documentos totales generados: ${totalDocs}).`);

    if (historyDocs.length > 0) {
        await ReportStatusHistory.collection.insertMany(historyDocs);
        console.log(`${historyDocs.length} entradas de historial de estado insertadas.`);
    }

    const totalUsersDespues = await userModel.countDocuments();
    const totalReportsDespues = await reportModel.countDocuments();
    console.log(`Estado final -> usuarios: ${totalUsersDespues}, reportes: ${totalReportsDespues}`);

    await mongoose.disconnect();
    console.log("Listo.");
}

main().catch((err) => {
    console.error("Error en el seed:", err);
    process.exit(1);
});
