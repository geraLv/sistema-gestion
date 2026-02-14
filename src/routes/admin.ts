import { Router, Request, Response } from "express";
import { AuthRepository } from "../repositories/authRepository";
import { AuditService } from "../services/auditService";
import { AuditRepository } from "../repositories/auditRepository";
import { VendedorService } from "../services/referenciaService";

const router = Router();

const getRequestMeta = (req: Request) => ({
  ip: (req.headers["x-forwarded-for"] as string) || req.ip,
  userAgent: req.headers["user-agent"] as string,
});

router.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await AuthRepository.getAllUsers();
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/users", async (req: Request, res: Response) => {
  try {
    const { usuario, password, nombre, email, role, status } = req.body;
    if (!usuario || !password) {
      return res.status(400).json({
        success: false,
        error: "usuario y password son requeridos",
      });
    }
    const created = await AuthRepository.createUser(
      usuario,
      password,
      nombre,
      email,
      role || "user",
      status ?? 1,
    );

    await AuditService.log({
      actor: (req as any).user,
      action: "CREATE",
      entity: "app_user",
      entityId: created.iduser,
      before: null,
      after: created,
      ...getRequestMeta(req),
    });

    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/users/:id", async (req: Request, res: Response) => {
  try {
    const iduser = Number(req.params.id);
    if (!iduser) {
      return res.status(400).json({ success: false, error: "id inválido" });
    }
    const before = await AuthRepository.getUserById(iduser);
    const updated = await AuthRepository.updateUser(iduser, {
      usuario: req.body.usuario,
      nombre: req.body.nombre,
      email: req.body.email,
    });

    await AuditService.log({
      actor: (req as any).user,
      action: "UPDATE",
      entity: "app_user",
      entityId: iduser,
      before,
      after: updated,
      ...getRequestMeta(req),
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch("/users/:id/status", async (req: Request, res: Response) => {
  try {
    const iduser = Number(req.params.id);
    const status = Number(req.body.status);
    if (!iduser || Number.isNaN(status)) {
      return res.status(400).json({ success: false, error: "datos inválidos" });
    }
    const before = await AuthRepository.getUserById(iduser);
    await AuthRepository.setUserStatus(iduser, status);
    const after = await AuthRepository.getUserById(iduser);

    await AuditService.log({
      actor: (req as any).user,
      action: "STATUS_CHANGE",
      entity: "app_user",
      entityId: iduser,
      before,
      after,
      ...getRequestMeta(req),
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch("/users/:id/role", async (req: Request, res: Response) => {
  try {
    const iduser = Number(req.params.id);
    const role = String(req.body.role || "");
    if (!iduser || !role) {
      return res.status(400).json({ success: false, error: "datos inválidos" });
    }
    const before = await AuthRepository.getUserById(iduser);
    await AuthRepository.setUserRole(iduser, role);
    const after = await AuthRepository.getUserById(iduser);

    await AuditService.log({
      actor: (req as any).user,
      action: "ROLE_CHANGE",
      entity: "app_user",
      entityId: iduser,
      before,
      after,
      ...getRequestMeta(req),
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/audit", async (req: Request, res: Response) => {
  try {
    const logs = await AuditRepository.listLogs({
      entity: req.query.entity as string | undefined,
      entity_id: req.query.entity_id as string | undefined,
      action: req.query.action as string | undefined,
      actor: req.query.actor as string | undefined,
      date_from: req.query.date_from as string | undefined,
      date_to: req.query.date_to as string | undefined,
      q: req.query.q as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : 100,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    });
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/vendedores", async (_req: Request, res: Response) => {
  try {
    const data = await VendedorService.getAllVendedores();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/vendedores", async (req: Request, res: Response) => {
  try {
    const { apellidonombre, estado } = req.body;
    if (!apellidonombre) {
      return res
        .status(400)
        .json({ success: false, error: "apellidonombre requerido" });
    }
    const created = await VendedorService.createVendedor(
      apellidonombre,
      Number(estado) || 1,
    );

    await AuditService.log({
      actor: (req as any).user,
      action: "CREATE",
      entity: "vendedor",
      entityId: created.idvendedor,
      before: null,
      after: created,
      ...getRequestMeta(req),
    });

    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/vendedores/:id", async (req: Request, res: Response) => {
  try {
    const idvendedor = Number(req.params.id);
    const { apellidonombre } = req.body;
    if (!idvendedor || !apellidonombre) {
      return res.status(400).json({ success: false, error: "datos inválidos" });
    }
    const before = await VendedorService.getVendedorById(idvendedor);
    const updated = await VendedorService.updateVendedor(
      idvendedor,
      apellidonombre,
    );

    await AuditService.log({
      actor: (req as any).user,
      action: "UPDATE",
      entity: "vendedor",
      entityId: idvendedor,
      before,
      after: updated,
      ...getRequestMeta(req),
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch("/vendedores/:id/status", async (req: Request, res: Response) => {
  try {
    const idvendedor = Number(req.params.id);
    const estado = Number(req.body.estado);
    if (!idvendedor || Number.isNaN(estado)) {
      return res.status(400).json({ success: false, error: "datos inválidos" });
    }
    const before = await VendedorService.getVendedorById(idvendedor);
    await VendedorService.setVendedorStatus(idvendedor, estado);
    const after = await VendedorService.getVendedorById(idvendedor);

    await AuditService.log({
      actor: (req as any).user,
      action: "STATUS_CHANGE",
      entity: "vendedor",
      entityId: idvendedor,
      before,
      after,
      ...getRequestMeta(req),
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
