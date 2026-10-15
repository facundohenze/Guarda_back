/* OBSERVER: evento "cambio de estado de un reporte".
   updateReport solo avisa que el estado cambió; no sabe quién se entera.
   Cada reacción es un suscriptor y se registra abajo con suscribir(). */
const reportModel = require("../models/reportModel");
const ReportStatusHistory = require("../models/reportStatusHistoryModel");

const suscriptores = [];

const suscribir = (funcion) => {
    suscriptores.push(funcion);
};

/* evento = { report, estadoAnterior, estadoNuevo, user }
   se ejecutan en orden y con await para que un error siga llegando al controller */
const notificarCambioEstado = async (evento) => {
    for (const funcion of suscriptores) {
        await funcion(evento);
    }
};

/* --- Suscriptores --- */

/* registra el cambio en el historial del reporte */
const registrarHistorial = async ({ report, estadoAnterior, estadoNuevo, user }) => {
    await ReportStatusHistory.create({
        reportId: report._id,
        estadoAnterior,
        estadoNuevo,
        cambiadoPor: user._id,
    });
};

/* si el reporte es principal, lleva el nuevo estado a todos sus adheridos (y deja su historial) */
const sincronizarAdheridos = async ({ report, estadoNuevo, user }) => {
    if (!report.esPrincipal || report.adheridos.length === 0) return;

    const reporteIds = report.adheridos.map((a) => a.reporteId);

    // capturamos el estado anterior de cada adherido ANTES de actualizarlos
    const adheridosDocs = await reportModel.find(
        { _id: { $in: reporteIds } },
        { _id: 1, status: 1 }
    );

    await reportModel.updateMany(
        { _id: { $in: reporteIds } },
        { $set: { status: estadoNuevo } }
    );

    const historialAdheridos = adheridosDocs.map((adherido) => ({
        reportId: adherido._id,
        estadoAnterior: adherido.status,
        estadoNuevo,
        cambiadoPor: user._id,
        comentario: "Actualizado automáticamente por sincronización con el reporte principal",
    }));
    await ReportStatusHistory.insertMany(historialAdheridos);
};

suscribir(registrarHistorial);
suscribir(sincronizarAdheridos);

module.exports = { suscribir, notificarCambioEstado };
