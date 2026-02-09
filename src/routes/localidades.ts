import { Router, Request, Response } from "express";
import { LocalidadService } from "../services/localidadService";

const router = Router();

/**
 * GET /api/localidades
 * Obtiene lista de todas las localidades
 */
router.get("/", async (req: Request, res: Response) => {
  const result = await LocalidadService.listarLocalidades();

  if (result.success) {
    return res.json(result.data);
  } else {
    return res.status(500).json({ error: result.error });
  }
});

/**
 * GET /api/localidades/search?q=nombre
 * Busca localidades por nombre
 */
router.get("/search", async (req: Request, res: Response) => {
  const query = String(req.query.q || "");

  if (!query.trim()) {
    return res.status(400).json({ error: "Parámetro de búsqueda requerido" });
  }

  const result = await LocalidadService.buscarLocalidades(query);

  if (result.success) {
    return res.json(result.data);
  } else {
    return res.status(500).json({ error: result.error });
  }
});

/**
 * GET /api/localidades/:id
 * Obtiene una localidad por ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  const idlocalidad = parseInt(req.params.id, 10);

  if (isNaN(idlocalidad)) {
    return res.status(400).json({ error: "ID de localidad inválido" });
  }

  const result = await LocalidadService.obtenerLocalidad(idlocalidad);

  if (result.success) {
    return res.json(result.data);
  } else if (result.error === "Localidad no encontrada") {
    return res.status(404).json({ error: result.error });
  } else {
    return res.status(500).json({ error: result.error });
  }
});

export default router;
