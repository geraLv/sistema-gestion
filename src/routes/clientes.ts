import { Router, Request, Response } from "express";
import { ClienteService } from "../services/clienteService";
import { AuditService } from "../services/auditService";
import { CreateClienteDTO, UpdateClienteDTO } from "../types/cliente";

const router = Router();

const getRequestMeta = (req: Request) => ({
  ip: (req.headers["x-forwarded-for"] as string) || req.ip,
  userAgent: req.headers["user-agent"] as string,
});

/**
 * GET /api/clientes
 * Obtiene lista de todos los clientes
 */
router.get("/", async (req: Request, res: Response) => {
  const result = await ClienteService.listarClientes();

  if (result.success) {
    return res.json(result.data);
  } else {
    return res.status(500).json({ error: result.error });
  }
});

/**
 * GET /api/clientes/search?q=nombre
 * Busca clientes por nombre
 */
router.get("/search", async (req: Request, res: Response) => {
  const query = String(req.query.q || "");

  if (!query.trim()) {
    return res.status(400).json({ error: "Parámetro de búsqueda requerido" });
  }

  const result = await ClienteService.buscarClientes(query);

  if (result.success) {
    return res.json(result.data);
  } else {
    return res.status(500).json({ error: result.error });
  }
});

/**
 * GET /api/clientes/:id
 * Obtiene un cliente por ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  const idcliente = parseInt(req.params.id, 10);

  if (isNaN(idcliente)) {
    return res.status(400).json({ error: "ID de cliente inválido" });
  }

  const result = await ClienteService.obtenerCliente(idcliente);

  if (result.success) {
    return res.json(result.data);
  } else if (result.error === "Cliente no encontrado") {
    return res.status(404).json({ error: result.error });
  } else {
    return res.status(500).json({ error: result.error });
  }
});

/**
 * POST /api/clientes
 * Crea un nuevo cliente o actualiza si ya existe
 * Espera: JSON con appynom, dni, direccion, telefono, selectLocalidades
 * Opcionalmente: idcliente (si viene, es una actualización)
 */
router.post("/", async (req: Request, res: Response) => {
  const { idcliente, appynom, dni, direccion, telefono, selectLocalidades } =
    req.body;

  console.log(idcliente);

  // Validación básica de campos requeridos
  if (!appynom || !dni || !direccion || !telefono || !selectLocalidades) {
    return res.status(400).json({
      error:
        "Campos requeridos faltantes: appynom, dni, direccion, telefono, selectLocalidades",
    });
  }

  // Si viene idcliente, es una actualización
  if (idcliente) {
    const before = await ClienteService.obtenerCliente(idcliente);
    const updateDto: UpdateClienteDTO = {
      idcliente,
      appynom,
      dni,
      direccion,
      telefono,
      selectLocalidades: parseInt(selectLocalidades, 10),
    };

    const result = await ClienteService.actualizarCliente(updateDto);

    if (result.success) {
      await AuditService.log({
        actor: (req as any).user,
        action: "UPDATE",
        entity: "clientes",
        entityId: idcliente,
        before: before.data || before,
        after: result.data,
        ...getRequestMeta(req),
      });
      return res.json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } else {
      return res.status(400).json({ success: false, error: result.error });
    }
  } else {
    // Es un alta de nuevo cliente
    const createDto: CreateClienteDTO = {
      appynom,
      dni,
      direccion,
      telefono,
      selectLocalidades: parseInt(selectLocalidades, 10),
    };

    const result = await ClienteService.crearCliente(createDto);

    if (result.success) {
      await AuditService.log({
        actor: (req as any).user,
        action: "CREATE",
        entity: "clientes",
        entityId: (result.data as any)?.idcliente || null,
        before: null,
        after: result.data,
        ...getRequestMeta(req),
      });
      return res
        .status(201)
        .json({ success: true, message: result.message, data: result.data });
    } else {
      return res.status(400).json({ success: false, error: result.error });
    }
  }
});

export default router;
