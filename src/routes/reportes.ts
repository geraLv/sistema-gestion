import { Router } from "express";
import PDFDocument from "pdfkit";
import { ReporteService } from "../services/reporteService";
import { SolicitudService } from "../services/solicitudService";

const router = Router();

function getMesFromQuery(value?: string): string {
  if (!value) {
    const now = new Date();
    const mes = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${mes}`;
  }
  return value;
}

function isValidMes(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

router.post("/recibos/cuota", async (req, res) => {
  const idcuota = Number(req.body?.idcuota);

  if (!Number.isFinite(idcuota) || idcuota <= 0) {
    return res.status(400).json({
      success: false,
      error: "idcuota inválido",
    });
  }

  const data = await ReporteService.getReciboCuota(idcuota);
  if (!data) {
    return res.status(404).json({
      success: false,
      error: "Recibo no encontrado",
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=\"recibo-cuota-${idcuota}.pdf\"`,
  );

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  ReporteService.renderRecibo(doc, data);
  doc.end();
});

router.get("/recibos/mes", async (req, res) => {
  const mes = getMesFromQuery(String(req.query?.mes || ""));
  if (!isValidMes(mes)) {
    return res.status(400).json({
      success: false,
      error: "Formato de mes inválido. Use YYYY-MM",
    });
  }

  const localidadIdRaw = req.query?.localidadId;
  const localidadId =
    localidadIdRaw !== undefined ? Number(localidadIdRaw) : undefined;

  if (
    localidadId !== undefined &&
    (!Number.isFinite(localidadId) || localidadId <= 0)
  ) {
    return res.status(400).json({
      success: false,
      error: "localidadId inválido",
    });
  }

  const recibos = await ReporteService.getRecibosMes(mes, localidadId);
  if (recibos.length === 0) {
    return res.status(404).json({
      success: false,
      error: "No hay recibos para el mes solicitado",
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=\"recibos-${mes}.pdf\"`,
  );

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  ReporteService.renderRecibosMes(doc, recibos, mes);
  doc.end();
});

router.get("/recibos/mes-posterior", async (req, res) => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const mes = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;

  const localidadIdRaw = req.query?.localidadId;
  const localidadId =
    localidadIdRaw !== undefined ? Number(localidadIdRaw) : undefined;

  if (
    localidadId !== undefined &&
    (!Number.isFinite(localidadId) || localidadId <= 0)
  ) {
    return res.status(400).json({
      success: false,
      error: "localidadId inválido",
    });
  }

  const recibos = await ReporteService.getRecibosMes(mes, localidadId);
  if (recibos.length === 0) {
    return res.status(404).json({
      success: false,
      error: "No hay recibos para el mes posterior",
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=\"recibos-${mes}.pdf\"`,
  );

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  ReporteService.renderRecibosMes(doc, recibos, mes);
  doc.end();
});

router.get("/recibos/mes-por-localidad", async (req, res) => {
  const localidadIdRaw = req.query?.localidadId;
  const localidadId =
    localidadIdRaw !== undefined ? Number(localidadIdRaw) : undefined;

  if (!Number.isFinite(localidadId) || !localidadId || localidadId <= 0) {
    return res.status(400).json({
      success: false,
      error: "localidadId inválido",
    });
  }

  const mes = getMesFromQuery(String(req.query?.mes || ""));
  if (!isValidMes(mes)) {
    return res.status(400).json({
      success: false,
      error: "Formato de mes inválido. Use YYYY-MM",
    });
  }

  const recibos = await ReporteService.getRecibosMes(mes, localidadId);
  if (recibos.length === 0) {
    return res.status(404).json({
      success: false,
      error: "No hay recibos para el mes y localidad solicitados",
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=\"recibos-${mes}-loc-${localidadId}.pdf\"`,
  );

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  ReporteService.renderRecibosMes(doc, recibos, mes);
  doc.end();
});

router.get("/recibos/mes-posterior-por-localidad", async (req, res) => {
  const localidadIdRaw = req.query?.localidadId;
  const localidadId =
    localidadIdRaw !== undefined ? Number(localidadIdRaw) : undefined;

  if (!Number.isFinite(localidadId) || !localidadId || localidadId <= 0) {
    return res.status(400).json({
      success: false,
      error: "localidadId inválido",
    });
  }

  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const mes = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;

  const recibos = await ReporteService.getRecibosMes(mes, localidadId);
  if (recibos.length === 0) {
    return res.status(404).json({
      success: false,
      error: "No hay recibos para el mes posterior y localidad solicitados",
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=\"recibos-${mes}-loc-${localidadId}.pdf\"`,
  );

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  ReporteService.renderRecibosMes(doc, recibos, mes);
  doc.end();
});

router.get("/solicitudes/monitor", async (req, res) => {
  const nroSolicitud = String(req.query?.nroSolicitud || "").trim();
  if (!nroSolicitud) {
    return res.status(400).json({
      success: false,
      error: "nroSolicitud es requerido",
    });
  }

  const result = await SolicitudService.obtenerSolicitudPorNro(nroSolicitud);
  if (!result.success || !result.data) {
    return res.status(404).json({
      success: false,
      error: result.error || "Solicitud no encontrada",
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=\"monitor-solicitud-${nroSolicitud}.pdf\"`,
  );

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  ReporteService.renderSolicitudMonitor(doc, result.data);
  doc.end();
});

router.get("/solicitudes.xlsx", async (req, res) => {
  const estado = String(req.query?.estado || "").toLowerCase();
  if (!["impagas", "pagas", "bajas"].includes(estado)) {
    return res.status(400).json({
      success: false,
      error: "estado inválido. Use impagas, pagas o bajas",
    });
  }

  const mes = getMesFromQuery(String(req.query?.mes || ""));
  if (!isValidMes(mes)) {
    return res.status(400).json({
      success: false,
      error: "Formato de mes inválido. Use YYYY-MM",
    });
  }

  const modoRaw = String(req.query?.modo || "resumen").toLowerCase();
  const modo = modoRaw === "detalle" ? "detalle" : "resumen";

  const rows = await ReporteService.getSolicitudesReporte(
    estado as "impagas" | "pagas" | "bajas",
    mes,
    modo,
  );

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: "No hay registros para el filtro solicitado",
    });
  }

  const buffer = await ReporteService.buildSolicitudesXlsx(rows);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=\"solicitudes-${estado}-${mes}-${modo}.xlsx\"`,
  );
  res.send(buffer);
});

export default router;
