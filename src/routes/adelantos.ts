import { Router, Request, Response } from "express";
import { AdelantoService } from "../services/cuotaService";
import { AuditService } from "../services/auditService";

const adelantosRouter = Router();

const getRequestMeta = (req: Request) => ({
  ip: (req.headers["x-forwarded-for"] as string) || req.ip,
  userAgent: req.headers["user-agent"] as string,
});

/**
 * GET /api/adelantos - Listar todos los adelantos
 */
adelantosRouter.get("/", async (req: Request, res: Response) => {
  try {
    const adelantos = await AdelantoService.obtenerAdelantosDetallados();

    res.json({
      success: true,
      data: adelantos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/adelantos/:idsolicitud - Consultar adelantos de una solicitud
 */
adelantosRouter.get("/:idsolicitud", async (req: Request, res: Response) => {
  try {
    const { idsolicitud } = req.params;

    const resultado = await AdelantoService.consultarAdelanto(
      Number(idsolicitud),
    );

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
 * POST /api/adelantos - Registrar un nuevo adelanto
 */
adelantosRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { idsolicitud, adelantoimporte } = req.body;

    if (!idsolicitud || !adelantoimporte) {
      return res.status(400).json({
        success: false,
        error: "idsolicitud y adelantoimporte son requeridos",
      });
    }

    const adelanto = await AdelantoService.cargarAdelanto({
      idsolicitud: Number(idsolicitud),
      adelantoimporte: Number(adelantoimporte),
    });

    await AuditService.log({
      actor: (req as any).user,
      action: "CREATE",
      entity: "adelantos",
      entityId: (adelanto as any)?.idadelanto || null,
      before: null,
      after: adelanto,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      data: adelanto,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default adelantosRouter;
