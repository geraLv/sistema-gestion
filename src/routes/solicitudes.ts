import { Router, Request, Response } from "express";
import { SolicitudService } from "../services/solicitudService";
import { AuditService } from "../services/auditService";
import { CreateSolicitudDTO, UpdateSolicitudDTO } from "../types/solicitud";

const router = Router();

const getRequestMeta = (req: Request) => ({
  ip: (req.headers["x-forwarded-for"] as string) || req.ip,
  userAgent: req.headers["user-agent"] as string,
});

/**
 * GET /api/solicitudes
 * Obtiene todas las solicitudes
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const filtro = req.query.filtro as
      | "pagadas"
      | "impagas"
      | "pendientes"
      | undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;

    if (page !== undefined && (!Number.isFinite(page) || page <= 0)) {
      return res
        .status(400)
        .json({ success: false, error: "page inválido" });
    }
    if (
      pageSize !== undefined &&
      (!Number.isFinite(pageSize) || pageSize <= 0)
    ) {
      return res
        .status(400)
        .json({ success: false, error: "pageSize inválido" });
    }

    const result = await SolicitudService.listarSolicitudes(
      q,
      page,
      pageSize,
      filtro,
    );
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({
      success: true,
      data: result.data || [],
      total: result.total ?? null,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Error al obtener solicitudes",
    });
  }
});

/**
 * GET /api/solicitudes/nro/:nrosolicitud
 * Obtiene una solicitud específica por número
 */
router.get("/nro/:nrosolicitud", async (req: Request, res: Response) => {
  try {
    const { nrosolicitud } = req.params;
    const result = await SolicitudService.obtenerSolicitudPorNro(nrosolicitud);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Error al obtener solicitud",
    });
  }
});

/**
 * GET /api/solicitudes/:id
 * Obtiene una solicitud específica por ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const idsolicitud = parseInt(req.params.id, 10);
    const result = await SolicitudService.obtenerSolicitud(idsolicitud);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Error al obtener solicitud",
    });
  }
});

/**
 * GET /api/solicitudes/:id/cuotas
 * Obtiene todas las cuotas de una solicitud
 */
router.get("/:id/cuotas", async (req: Request, res: Response) => {
  try {
    const idsolicitud = parseInt(req.params.id, 10);
    const result = await SolicitudService.obtenerCuotas(idsolicitud);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result.data || [] });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Error al obtener cuotas",
    });
  }
});

/**
 * POST /api/solicitudes
 * Crea una nueva solicitud con cuotas automáticas
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      selectCliente,
      idproducto,
      selectVendedor,
      monto,
      totalapagar,
      selectCuotas,
      nroSolicitud,
      observacion,
    } = req.body;

    const dto: CreateSolicitudDTO = {
      selectCliente: parseInt(selectCliente, 10),
      idproducto: parseInt(idproducto, 10),
      selectVendedor: parseInt(selectVendedor, 10),
      monto: parseFloat(monto),
      totalapagar: parseFloat(totalapagar),
      selectCuotas: parseInt(selectCuotas, 10),
      nroSolicitud: nroSolicitud || undefined,
      observacion: observacion || "",
    };

    const result = await SolicitudService.crearSolicitud(dto);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    await AuditService.log({
      actor: (req as any).user,
      action: "CREATE",
      entity: "solicitud",
      entityId: (result.data as any)?.idsolicitud || null,
      before: null,
      after: result.data,
      ...getRequestMeta(req),
    });

    res.status(201).json({ success: true, data: result.data, message: result.message });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Error al crear solicitud",
    });
  }
});

/**
 * PUT /api/solicitudes/:id
 * Actualiza una solicitud existente
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const idsolicitud = parseInt(req.params.id, 10);
    const {
      selectCliente,
      selectVendedor,
      monto,
      selectCuotas,
      nroSolicitud,
      totalapagar,
      observacion,
      selectEstado,
      idproducto,
    } = req.body;

    const dto: UpdateSolicitudDTO = {
      idsolicitud,
      selectCliente: selectCliente ? parseInt(selectCliente, 10) : undefined,
      selectVendedor: selectVendedor ? parseInt(selectVendedor, 10) : undefined,
      idproducto: idproducto ? parseInt(idproducto, 10) : undefined,
      monto: parseFloat(monto),
      selectCuotas: parseInt(selectCuotas, 10),
      nroSolicitud,
      totalapagar: parseFloat(totalapagar),
      observacion: observacion || "",
      selectEstado: parseInt(selectEstado, 10) || 1,
    };

    const before = await SolicitudService.obtenerSolicitud(idsolicitud);
    const result = await SolicitudService.actualizarSolicitud(dto);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    await AuditService.log({
      actor: (req as any).user,
      action: "UPDATE",
      entity: "solicitud",
      entityId: idsolicitud,
      before: before.data || before,
      after: result.data,
      ...getRequestMeta(req),
    });

    res.json({ success: true, data: result.data, message: result.message });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Error al actualizar solicitud",
    });
  }
});

/**
 * POST /api/solicitudes/:id/cuotas
 * Agrega cuotas adicionales
 */
router.post("/:id/cuotas", async (req: Request, res: Response) => {
  try {
    const idsolicitud = parseInt(req.params.id, 10);
    const { cantidadNueva } = req.body;

    const before = await SolicitudService.obtenerSolicitud(idsolicitud);
    const result = await SolicitudService.adicionarCuotas(
      idsolicitud,
      parseInt(cantidadNueva, 10),
    );
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    await AuditService.log({
      actor: (req as any).user,
      action: "UPDATE",
      entity: "solicitud",
      entityId: idsolicitud,
      before: before.data || before,
      after: result.data || result,
      ...getRequestMeta(req),
    });

    res.json({ success: true, data: result.data, message: result.message });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Error al agregar cuotas",
    });
  }
});

/**
 * PUT /api/solicitudes/:nro/observaciones
 * Actualiza observaciones
 */
router.put("/:nro/observaciones", async (req: Request, res: Response) => {
  try {
    const { nro } = req.params;
    const { observacion } = req.body;

    if (!observacion) {
      return res.status(400).json({
        success: false,
        error: "Observación es requerida",
      });
    }

    const before = await SolicitudService.obtenerSolicitudPorNro(nro);
    const result = await SolicitudService.actualizarObservaciones(
      nro,
      observacion,
    );
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    await AuditService.log({
      actor: (req as any).user,
      action: "UPDATE",
      entity: "solicitud",
      entityId: nro,
      before: before.data || before,
      after: result.data || result,
      ...getRequestMeta(req),
    });

    res.json({ success: true, data: result.data, message: result.message });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Error al actualizar observaciones",
    });
  }
});

export default router;
