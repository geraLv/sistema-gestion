import { Router, Request, Response } from "express";
import { PortalClienteService } from "../services/portalClienteService";

const router = Router();

/**
 * POST /api/portal/consulta
 * Consulta pública por DNI (requiere CAPTCHA)
 * Body: { dni: string, captchaToken: string }
 */
router.post("/consulta", async (req: Request, res: Response) => {
    try {
        const { dni, captchaToken } = req.body;

        if (!dni) {
            return res.status(400).json({
                success: false,
                error: "DNI es requerido",
            });
        }

        if (!captchaToken && process.env.RECAPTCHA_SECRET_KEY) {
            return res.status(400).json({
                success: false,
                error: "Verificación CAPTCHA requerida",
            });
        }

        const result = await PortalClienteService.consultar(
            dni,
            captchaToken || "",
        );

        if (!result.success) {
            return res.status(404).json({
                success: false,
                error: result.error,
            });
        }

        // Set portal token as httpOnly cookie
        const isProd = process.env.NODE_ENV === "production";
        res.cookie("portal_token", result.portalToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: (isProd ? "none" : "lax") as "none" | "lax",
            path: "/api/portal",
            maxAge: 10 * 60 * 1000, // 10 minutes
        });

        res.json({
            success: true,
            data: result.data,
        });
    } catch (error: any) {
        console.error("Portal consulta error:", error);
        res.status(500).json({
            success: false,
            error: "Error interno del servidor",
        });
    }
});

/**
 * GET /api/portal/solicitud/:idsolicitud/cuotas
 * Obtiene cuotas de una solicitud (requiere portal token)
 */
router.get(
    "/solicitud/:idsolicitud/cuotas",
    async (req: Request, res: Response) => {
        try {
            const idsolicitud = parseInt(req.params.idsolicitud, 10);
            if (isNaN(idsolicitud) || idsolicitud <= 0) {
                return res.status(400).json({
                    success: false,
                    error: "ID de solicitud inválido",
                });
            }

            // Get portal token from cookie or Authorization header
            const portalToken =
                (req as any).cookies?.portal_token ||
                req.headers["authorization"]?.split(" ")[1] ||
                "";

            if (!portalToken) {
                return res.status(401).json({
                    success: false,
                    error: "Token de sesión requerido. Realice una consulta por DNI primero.",
                });
            }

            const result = await PortalClienteService.obtenerCuotas(
                idsolicitud,
                portalToken,
            );

            if (!result.success) {
                const status = result.error?.includes("inválido") || result.error?.includes("expirado")
                    ? 401
                    : 404;
                return res.status(status).json({
                    success: false,
                    error: result.error,
                });
            }

            res.json({
                success: true,
                data: result.data,
            });
        } catch (error: any) {
            console.error("Portal cuotas error:", error);
            res.status(500).json({
                success: false,
                error: "Error interno del servidor",
            });
        }
    },
);

export default router;
