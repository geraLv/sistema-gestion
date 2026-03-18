import { Router, Request, Response } from "express";
import { DashboardService } from "../services/dashboardService";
import { authenticateToken } from "./auth";

const router = Router();

router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const mes = typeof req.query.mes === "string" ? req.query.mes : undefined;
    const data = await DashboardService.getDashboardSummary(mes);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Error al obtener dashboard",
    });
  }
});

export default router;
