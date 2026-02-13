import { Router, Request, Response } from "express";
import multer from "multer";
import { CuotaService, AdelantoService } from "../services/cuotaService";
import { CuotaRepository } from "../repositories/cuotaRepository";
import { AuditService } from "../services/auditService";
import { supabase } from "../db";
import { ComprobanteRepository } from "../repositories/comprobanteRepository";

const cuotasRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

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
 * GET /api/cuotas/:idcuota/comprobantes - Listar comprobantes de cuota
 */
cuotasRouter.get(
  "/:idcuota/comprobantes",
  async (req: Request, res: Response) => {
    try {
      const idcuota = Number(req.params.idcuota);
      if (!Number.isFinite(idcuota) || idcuota <= 0) {
        return res.status(400).json({
          success: false,
          error: "idcuota inválido",
        });
      }
      const items = await ComprobanteRepository.listByCuota(idcuota);
      return res.json({ success: true, data: items });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

/**
 * POST /api/cuotas/:idcuota/comprobante - Subir comprobante PDF
 */
cuotasRouter.post(
  "/:idcuota/comprobante",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const idcuota = Number(req.params.idcuota);
      if (!Number.isFinite(idcuota) || idcuota <= 0) {
        return res.status(400).json({
          success: false,
          error: "idcuota inválido",
        });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: "Archivo PDF requerido",
        });
      }
      if (file.mimetype !== "application/pdf") {
        return res.status(400).json({
          success: false,
          error: "Solo se permite PDF",
        });
      }

      const cuota = await CuotaRepository.getCuotaById(idcuota);
      if (!cuota) {
        return res.status(404).json({
          success: false,
          error: "Cuota no encontrada",
        });
      }

      const ext = "pdf";
      const safeName = `cuota-${idcuota}-${Date.now()}.${ext}`;
      const path = `cuotas/${idcuota}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("comprobantes")
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });
      console.log("avel?", uploadError);
      if (uploadError) {
        return res.status(500).json({
          success: false,
          error: `Error al subir comprobante: ${uploadError.message}`,
        });
      }

      const { data: publicData } = supabase.storage
        .from("comprobantes")
        .getPublicUrl(path);

      const created = await ComprobanteRepository.create({
        idcuota,
        archivo_path: path,
        archivo_url: publicData.publicUrl,
        archivo_nombre: file.originalname,
        archivo_tipo: file.mimetype,
        archivo_size: file.size,
        created_by: (req as any).user?.iduser ?? null,
      });

      try {
        await AuditService.log({
          actor: (req as any).user,
          action: "CREATE",
          entity: "cuota_comprobante",
          entityId: created.idcomprobante,
          before: null,
          after: created,
          ...getRequestMeta(req),
        });
      } catch (auditError) {
        console.error("Audit log failed (comprobante):", auditError);
      }

      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

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
    // console.log(before);
    const resultado = await CuotaService.pagarCuota({ idcuota });
    console.log(resultado);
    const after = await CuotaRepository.getCuotaById(Number(idcuota));

    try {
      await AuditService.log({
        actor: (req as any).user,
        action: "UPDATE",
        entity: "cuotas",
        entityId: idcuota,
        before,
        after,
        ...getRequestMeta(req),
      });
    } catch (auditError) {
      console.error("Audit log failed (pagar cuota):", auditError);
    }

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

    try {
      await AuditService.log({
        actor: (req as any).user,
        action: "UPDATE",
        entity: "cuotas",
        entityId: idcuotas.join(","),
        before,
        after,
        ...getRequestMeta(req),
      });
    } catch (auditError) {
      console.error("Audit log failed (pagar múltiples):", auditError);
    }

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

    try {
      await AuditService.log({
        actor: (req as any).user,
        action: "UPDATE",
        entity: "cuotas",
        entityId: idcuota,
        before,
        after,
        ...getRequestMeta(req),
      });
    } catch (auditError) {
      console.error("Audit log failed (update importe):", auditError);
    }

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
