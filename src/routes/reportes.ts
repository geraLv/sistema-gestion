import { Router, Request, Response, NextFunction } from "express";
import PDFDocument from "pdfkit";
import { ReporteService } from "../services/reporteService";
import { SolicitudService } from "../services/solicitudService";
import { CuotaService } from "../services/cuotaService";
import { AuditService } from "../services/auditService";
import { asyncHandler } from "../middleware/errorHandler";
import { extractReciboFirmaData, ReciboFirmaData } from "../utils/reciboFirma";
import { ValidationError } from "../utils/errors";

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

const getRequestMeta = (req: Request) => ({
  ip: (req.headers["x-forwarded-for"] as string) || req.ip,
  userAgent: req.headers["user-agent"] as string,
});

const logSignedReceiptAudit = async (
  req: Request,
  entityId: string,
  firmaData: ReciboFirmaData,
  extra: Record<string, unknown> = {},
) => {
  try {
    await AuditService.log({
      actor: (req as any).user,
      action: "UPDATE",
      entity: "recibos_firmados",
      entityId,
      before: null,
      after: {
        firmado: true,
        mimeType: firmaData.mimeType,
        sizeBytes: firmaData.sizeBytes,
        aclaracion: firmaData.aclaracion,
        ...extra,
      },
      ...getRequestMeta(req),
    });
  } catch (auditError: any) {
    console.warn("No se pudo registrar auditoría de recibo firmado:", auditError?.message || auditError);
  }
};

router.post("/recibos/cuota", asyncHandler(async (req: Request, res: Response) => {
  const idcuota = Number(req.body?.idcuota);

  if (!Number.isFinite(idcuota) || idcuota <= 0) {
    return res.status(400).json({
      success: false,
      error: "idcuota inválido",
    });
  }

  const firmaData = extractReciboFirmaData(req.body);
  const data = await ReporteService.getReciboCuota(idcuota);
  if (!data) {
    return res.status(404).json({
      success: false,
      error: "Recibo no encontrado",
    });
  }

  if (data.estado !== 2) {
    throw new ValidationError("Solo se pueden imprimir recibos de cuotas pagadas.");
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=\"recibo-cuota-${idcuota}.pdf\"`,
  );

  const sinFecha = req.body?.sinFecha === true || req.body?.sinFecha === "true";
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  ReporteService.renderRecibo(doc, data, sinFecha, firmaData);
  doc.end();

  if (firmaData) {
    await logSignedReceiptAudit(req, `cuota:${idcuota}`, firmaData, {
      endpoint: "recibos/cuota",
    });
  }
}));

router.post("/recibos/ultima-pagada/:nrosolicitud", asyncHandler(async (req: Request, res: Response) => {
  const nrosolicitud = req.params.nrosolicitud;

  if (!nrosolicitud || nrosolicitud.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "nrosolicitud inválido",
    });
  }

  // Find the last paid cuota for this nrosolicitud
  const idcuota = await CuotaService.obtenerUltimaCuotaPagadaPorNroSolicitud(nrosolicitud);

  if (!idcuota) {
    return res.status(404).json({
      success: false,
      error: "La solicitud no tiene cuotas pagadas o no existe",
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
    `attachment; filename=\"recibo-ultima-pagada-${nrosolicitud}.pdf\"`,
  );

  const sinFecha = req.body?.sinFecha === true || req.body?.sinFecha === "true";
  const firmaData = extractReciboFirmaData(req.body);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  ReporteService.renderRecibo(doc, data, sinFecha, firmaData);
  doc.end();

  if (firmaData) {
    await logSignedReceiptAudit(req, `solicitud:${nrosolicitud}:ultima-pagada`, firmaData, {
      endpoint: "recibos/ultima-pagada",
      idcuota,
    });
  }
}));

router.post("/recibos/multiples", asyncHandler(async (req: Request, res: Response) => {
  const idcuotasRaw = req.body?.idcuotas;

  if (!Array.isArray(idcuotasRaw) || idcuotasRaw.length === 0) {
    return res.status(400).json({
      success: false,
      error: "idcuotas debe ser un arreglo no vacío de números",
    });
  }

  const idcuotas = [...new Set(idcuotasRaw.map((id: unknown) => Number(id)))];
  if (idcuotas.some((id) => !Number.isFinite(id) || id <= 0)) {
    throw new ValidationError("idcuotas contiene valores inválidos.");
  }

  const recibos = await ReporteService.getRecibosMultiples(idcuotas);
  if (!recibos || recibos.length === 0) {
    return res.status(404).json({
      success: false,
      error: "No se encontraron recibos para los IDs proporcionados",
    });
  }

  if (recibos.length !== idcuotas.length) {
    throw new ValidationError(
      "Solo se pueden imprimir cuotas pagadas y existentes en la selección.",
    );
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=\"recibos-multiples.pdf\"`,
  );

  const firmaData = extractReciboFirmaData(req.body);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  ReporteService.renderRecibosMultiples(doc, recibos, firmaData);
  doc.end();

  if (firmaData) {
    await logSignedReceiptAudit(req, "multiples", firmaData, {
      endpoint: "recibos/multiples",
      cantidadRecibos: recibos.length,
      idcuotas,
    });
  }
}));

// Endpoint para exportar monitor de solicitud
router.get(
  "/monitor-solicitud/pdf",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idsolicitud = Number(req.query.idsolicitud);

      if (!Number.isFinite(idsolicitud) || idsolicitud <= 0) {
        return res.status(400).json({
          success: false,
          error: "idsolicitud inválido",
        });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=\"monitor-solicitud-${idsolicitud}.pdf\"`,
      );

      const doc = new PDFDocument({ size: "A4", margin: 40 });
      doc.pipe(res);
      await ReporteService.renderMonitorSolicitud(doc, idsolicitud);
      doc.end();
    } catch (error) {
      console.error("Error generating monitor solicitud PDF report:", error);
      next(error);
    }
  },
);

// Endpoint para exportar recibos de solicitud pagados
router.get(
  "/recibos-solicitud-pagados/pdf",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idsolicitud = Number(req.query.idsolicitud);

      if (!Number.isFinite(idsolicitud) || idsolicitud <= 0) {
        return res.status(400).json({
          success: false,
          error: "idsolicitud inválido",
        });
      }

      const recibos = await ReporteService.getRecibosSolicitudPagados(idsolicitud);
      if (!recibos || recibos.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No hay recibos pagados para la solicitud",
        });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=\"recibos-solicitud-${idsolicitud}.pdf\"`,
      );

      const doc = new PDFDocument({ size: "A4", margin: 40 });
      doc.pipe(res);
      ReporteService.renderRecibosSolicitudPagados(doc, recibos);
      doc.end();
    } catch (error) {
      console.error("Error generating recibos solicitud pagados PDF report:", error);
      next(error);
    }
  },
);

router.post("/recibos/solicitud/:idsolicitud", asyncHandler(async (req: Request, res: Response) => {
  const idsolicitud = Number(req.params.idsolicitud);

  if (!Number.isFinite(idsolicitud) || idsolicitud <= 0) {
    return res.status(400).json({
      success: false,
      error: "idsolicitud inválido",
    });
  }

  const recibos = await ReporteService.getRecibosSolicitudPagados(idsolicitud);
  if (recibos.length === 0) {
    return res.status(404).json({
      success: false,
      error: "No hay cuotas pagadas para esta solicitud",
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=\"recibos-pagados-${idsolicitud}.pdf\"`,
  );

  const firmaData = extractReciboFirmaData(req.body);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  ReporteService.renderRecibosSolicitudPagados(doc, recibos, firmaData);
  doc.end();

  if (firmaData) {
    await logSignedReceiptAudit(req, `solicitud:${idsolicitud}`, firmaData, {
      endpoint: "recibos/solicitud",
      cantidadRecibos: recibos.length,
    });
  }
}));

// Endpoint para exportar análisis de cartera a PDF
router.get(
  "/analisis-cartera/pdf",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=\"reporte-analisis-cartera.pdf\"`,
      );

      const doc = new PDFDocument({ size: "A4", margin: 40 });
      doc.pipe(res);
      await ReporteService.renderAnalisisCartera(doc); // Assuming a render method exists
      doc.end();
    } catch (error) {
      console.error("Error generating analisis cartera PDF report:", error);
      next(error);
    }
  },
);

// Endpoint para exportar reporte de mora a PDF
router.get(
  "/mora/pdf",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=\"reporte-mora.pdf\"`,
      );

      const doc = new PDFDocument({ size: "A4", margin: 40 });
      doc.pipe(res);
      await ReporteService.renderReporteMora(doc); // Assuming a render method exists
      doc.end();
    } catch (error) {
      console.error("Error generating mora PDF report:", error);
      next(error);
    }
  },
);

// Endpoint para obtener reporte de mora
router.get(
  "/mora",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const datos = await ReporteService.generarReporteMora();
      res.status(200).json({
        success: true,
        message: "Reporte de mora generado",
        data: datos,
      });
    } catch (error) {
      console.error("Error generating mora report:", error);
      next(error);
    }
  },
);

// Endpoint para obtener eficiencia de cobranza por vendedor
router.get(
  "/eficiencia-vendedores",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fechaInicio, fechaFin } = req.query;

      // Placeholder for actual implementation
      // You would typically fetch data based on fechaInicio and fechaFin
      // and then generate a PDF or other report.
      res.status(200).json({
        success: true,
        message: "Eficiencia de vendedores report endpoint hit",
        query: { fechaInicio, fechaFin },
      });
    } catch (error) {
      console.error("Error generating eficiencia de vendedores report:", error);
      next(error);
    }
  },
);

// Endpoint para obtener reporte de cobranza
router.get(
  "/cobranza",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fechaInicio, fechaFin } = req.query;

      // Placeholder for actual implementation
      // You would typically fetch data based on fechaInicio and fechaFin
      // and then generate a PDF or other report.
      res.status(200).json({
        success: true,
        message: "Cobranza report endpoint hit",
        query: { fechaInicio, fechaFin },
      });
    } catch (error) {
      console.error("Error generating cobranza report:", error);
      next(error); // Pass error to the next middleware
    }
  },
);

router.post("/recibos/mes", asyncHandler(async (req: Request, res: Response) => {
  const mes = getMesFromQuery(String(req.body?.mes || ""));
  if (!isValidMes(mes)) {
    return res.status(400).json({
      success: false,
      error: "Formato de mes inválido. Use YYYY-MM",
    });
  }

  const localidadIdRaw = req.body?.localidadId;
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
    `attachment; filename=\"recibos-${mes}.pdf\"`,
  );

  const sinFecha = req.body?.sinFecha === true || req.body?.sinFecha === "true";
  const firmaData = extractReciboFirmaData(req.body);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  ReporteService.renderRecibosMes(doc, recibos, mes, sinFecha, firmaData);
  doc.end();

  if (firmaData) {
    await logSignedReceiptAudit(req, `mes:${mes}`, firmaData, {
      endpoint: "recibos/mes",
      cantidadRecibos: recibos.length,
      localidadId: localidadId ?? null,
    });
  }
}));

router.post("/recibos/mes-posterior", asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const mes = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  const localidadIdRaw = req.body?.localidadId;
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
    `attachment; filename=\"recibos-${mes}.pdf\"`,
  );

  const sinFecha = req.body?.sinFecha === true || req.body?.sinFecha === "true";
  const firmaData = extractReciboFirmaData(req.body);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  ReporteService.renderRecibosMes(doc, recibos, mes, sinFecha, firmaData);
  doc.end();

  if (firmaData) {
    await logSignedReceiptAudit(req, `mes-posterior:${mes}`, firmaData, {
      endpoint: "recibos/mes-posterior",
      cantidadRecibos: recibos.length,
      localidadId: localidadId ?? null,
    });
  }
}));

router.post("/recibos/mes-por-localidad", asyncHandler(async (req: Request, res: Response) => {
  const localidadIdRaw = req.body?.localidadId;
  const localidadId =
    localidadIdRaw !== undefined ? Number(localidadIdRaw) : undefined;

  if (!Number.isFinite(localidadId) || !localidadId || localidadId <= 0) {
    return res.status(400).json({
      success: false,
      error: "localidadId inválido",
    });
  }

  const mes = getMesFromQuery(String(req.body?.mes || ""));
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
    `attachment; filename=\"recibos-${mes}-loc-${localidadId}.pdf\"`,
  );

  const sinFecha = req.body?.sinFecha === true || req.body?.sinFecha === "true";
  const firmaData = extractReciboFirmaData(req.body);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  ReporteService.renderRecibosMes(doc, recibos, mes, sinFecha, firmaData);
  doc.end();

  if (firmaData) {
    await logSignedReceiptAudit(req, `mes-localidad:${mes}:${localidadId}`, firmaData, {
      endpoint: "recibos/mes-por-localidad",
      cantidadRecibos: recibos.length,
      localidadId,
    });
  }
}));

router.post("/recibos/mes-posterior-por-localidad", asyncHandler(async (req: Request, res: Response) => {
  const localidadIdRaw = req.body?.localidadId;
  const localidadId =
    localidadIdRaw !== undefined ? Number(localidadIdRaw) : undefined;

  if (!Number.isFinite(localidadId) || !localidadId || localidadId <= 0) {
    return res.status(400).json({
      success: false,
      error: "localidadId inválido",
    });
  }

  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const mes = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

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
    `attachment; filename=\"recibos-${mes}-loc-${localidadId}.pdf\"`,
  );

  const sinFecha = req.body?.sinFecha === true || req.body?.sinFecha === "true";
  const firmaData = extractReciboFirmaData(req.body);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  ReporteService.renderRecibosMes(doc, recibos, mes, sinFecha, firmaData);
  doc.end();

  if (firmaData) {
    await logSignedReceiptAudit(req, `mes-posterior-localidad:${mes}:${localidadId}`, firmaData, {
      endpoint: "recibos/mes-posterior-por-localidad",
      cantidadRecibos: recibos.length,
      localidadId,
    });
  }
}));

router.get("/solicitudes/monitor", async (req: Request, res: Response, next: NextFunction) => {
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
    `attachment; filename=\"monitor-solicitud-${nroSolicitud}.pdf\"`,
  );

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  ReporteService.renderSolicitudMonitor(doc, result.data);
  doc.end();
});

router.get("/solicitudes.xlsx", async (req: Request, res: Response, next: NextFunction) => {
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
