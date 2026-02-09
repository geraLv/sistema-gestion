import { Router, Request, Response } from "express";
import { CuotaService, AdelantoService } from "../services/cuotaService";
import { CuotaRepository } from "../repositories/cuotaRepository";
import { AuditService } from "../services/auditService";

const cuotasRouter = Router();

const getRequestMeta = (req: Request) => ({
  ip: (req.headers["x-forwarded-for"] as string) || req.ip,
  userAgent: req.headers["user-agent"] as string,
});

/**
 * GET /api/cuotas - Listar todas las cuotas
 */
cuotasRouter.get("/", async (req: Request, res: Response) => {
  try {
    const filtro = req.query.filtro as
      | "pagadas"
      | "impagas"
      | "vencidas"
      | undefined;

    const cuotas = await CuotaService.obtenerCuotas(filtro);

    res.json({
      success: true,
      data: cuotas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/cuotas/:idcuota - Obtener una cuota por ID
 */
cuotasRouter.get("/:idcuota", async (req: Request, res: Response) => {
  try {
    const { idcuota } = req.params;

    const cuota = await CuotaRepository.getCuotaById(Number(idcuota));
    if (!cuota) {
      return res.status(404).json({
        success: false,
        error: "Cuota no encontrada",
      });
    }

    res.json({
      success: true,
      data: cuota,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/cuotas/solicitud/:idsolicitud - Obtener cuotas de una solicitud
 */
cuotasRouter.get(
  "/solicitud/:idsolicitud",
  async (req: Request, res: Response) => {
    try {
      const { idsolicitud } = req.params;

      const cuotasResumen = await CuotaService.obtenerCuotasSolicitud(
        Number(idsolicitud),
      );

      res.json({
        success: true,
        data: cuotasResumen,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

/**
 * POST /api/cuotas/pagar - Pagar una cuota
 */
cuotasRouter.post("/pagar", async (req: Request, res: Response) => {
  try {
    const { idcuota } = req.body;

    if (!idcuota) {
      return res.status(400).json({
        success: false,
        error: "idcuota es requerido",
      });
    }

    const before = await CuotaRepository.getCuotaById(Number(idcuota));
    const resultado = await CuotaService.pagarCuota({ idcuota });
    const after = await CuotaRepository.getCuotaById(Number(idcuota));

    await AuditService.log({
      actor: (req as any).user,
      action: "UPDATE",
      entity: "cuotas",
      entityId: idcuota,
      before,
      after,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/cuotas/pagar-multiples - Pagar múltiples cuotas
 */
cuotasRouter.post("/pagar-multiples", async (req: Request, res: Response) => {
  try {
    const { idcuotas } = req.body;

    if (!idcuotas || !Array.isArray(idcuotas) || idcuotas.length === 0) {
      return res.status(400).json({
        success: false,
        error: "idcuotas debe ser un array no vacío",
      });
    }

    const before = await Promise.all(
      idcuotas.map((id: number) => CuotaRepository.getCuotaById(Number(id))),
    );
    const resultado = await CuotaService.pagarMultiplesCuotas({ idcuotas });
    const after = await Promise.all(
      idcuotas.map((id: number) => CuotaRepository.getCuotaById(Number(id))),
    );

    await AuditService.log({
      actor: (req as any).user,
      action: "UPDATE",
      entity: "cuotas",
      entityId: idcuotas.join(","),
      before,
      after,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * PUT /api/cuotas/:idcuota/importe - Modificar importe de una cuota
 */
cuotasRouter.put("/:idcuota/importe", async (req: Request, res: Response) => {
  try {
    const { idcuota } = req.params;
    const { importe } = req.body;

    if (!importe) {
      return res.status(400).json({
        success: false,
        error: "importe es requerido",
      });
    }

    const before = await CuotaRepository.getCuotaById(Number(idcuota));
    const cuota = await CuotaService.modificarImporte({
      idcuota: Number(idcuota),
      importe: Number(importe),
    });
    const after = await CuotaRepository.getCuotaById(Number(idcuota));

    await AuditService.log({
      actor: (req as any).user,
      action: "UPDATE",
      entity: "cuotas",
      entityId: idcuota,
      before,
      after,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      data: cuota,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default cuotasRouter;
