import { Router, Request, Response } from "express";
import { DashboardService } from "../services/dashboardService";
import { authenticateToken } from "./auth";

const router = Router();

router.get("/", authenticateToken, async (_req: Request, res: Response) => {
  try {
    const data = await DashboardService.getDashboardSummary();
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Error al obtener dashboard",
    });
  }
});

export default router;
