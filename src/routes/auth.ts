import { Router, Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import { AuditService } from "../services/auditService";
import { LoginDTO, ChangePasswordDTO } from "../types/auth";

const router = Router();

const getRequestMeta = (req: Request) => ({
  ip: (req.headers["x-forwarded-for"] as string) || req.ip,
  userAgent: req.headers["user-agent"] as string,
});

/**
 * Middleware para verificar autenticación
 * Uso: router.get('/protected', authenticateToken, handler)
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers["authorization"];
    const headerToken = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN
    const cookieToken = (req as any).cookies?.access_token;
    const token = headerToken || cookieToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token no proporcionado",
      });
    }

    const validation = await AuthService.validateToken(token);
    if (!validation.success || !validation.valid) {
      return res.status(401).json(validation);
    }

    // Agregar user info al request para uso en handlers
    (req as any).user = validation.user;
    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Error en autenticación",
    });
  }
};

export const requireRole = (role: "admin" | "user") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, error: "No autenticado" });
    }
    if (user.role !== role) {
      return res.status(403).json({ success: false, error: "Sin permisos" });
    }
    next();
  };
};

/**
 * POST /api/auth/login
 * Login con usuario y contraseña
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { usuario, password } = req.body;

    const dto: LoginDTO = {
      usuario: usuario?.trim() || "",
      password: password || "",
    };

    const result = await AuthService.login(dto);
    if (!result.success) {
      return res.status(401).json(result);
    }
    const isProd = process.env.NODE_ENV === "production";
    const cookieBase = {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? "none" : "lax") as "none" | "lax" | "strict",
      path: "/",
    };

    res.cookie("access_token", result.token, {
      ...cookieBase,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refresh_token", result.refreshToken, {
      ...cookieBase,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    await AuditService.log({
      actor: result.userData || result.user,
      action: "LOGIN",
      entity: "app_user",
      entityId: result.userData?.iduser || result.user?.iduser || null,
      before: null,
      after: result.userData || result.user || null,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      userData: result.userData || result.user,
      message: result.message,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Error en login",
    });
  }
});

/**
 * POST /api/auth/validate-token
 * Valida un token JWT
 */
router.post("/validate-token", async (req: Request, res: Response) => {
  try {
    let token = req.body.token || "";

    if (!token && req.headers["authorization"]) {
      token = req.headers["authorization"].split(" ")[1];
    }
    if (!token) {
      token = (req as any).cookies?.access_token || "";
    }

    const result = await AuthService.validateToken(token);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Error validando token",
    });
  }
});

/**
 * GET /api/auth/me
 * Obtiene información del usuario autenticado
 */
router.get("/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    const token =
      req.headers["authorization"]?.split(" ")[1] ||
      (req as any).cookies?.access_token;
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token no encontrado",
      });
    }

    const result = await AuthService.getCurrentUser(token);
    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json({
      success: true,
      userData: result.user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Error obteniendo usuario",
    });
  }
});

/**
 * POST /api/auth/change-password
 * Cambia la contraseña del usuario
 */
router.post(
  "/change-password",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { usuario, passwordActual, passwordNueva } = req.body;

      const dto: ChangePasswordDTO = {
        usuario: usuario?.trim() || "",
        passwordActual: passwordActual || "",
        passwordNueva: passwordNueva || "",
      };

      const result = await AuthService.changePassword(dto);
      if (!result.success) {
        return res.status(400).json(result);
      }

      await AuditService.log({
        actor: (req as any).user,
        action: "PASSWORD_CHANGE",
        entity: "app_user",
        entityId: (req as any).user?.iduser || null,
        before: null,
        after: null,
        ...getRequestMeta(req),
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Error cambiando contraseña",
      });
    }
  },
);

/**
 * POST /api/auth/logout
 * Logout
 */
router.post(
  "/logout",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      await AuthService.clearRefreshToken((req as any).user?.iduser);

      const isProd = process.env.NODE_ENV === "production";
      const cookieBase = {
        httpOnly: true,
        secure: isProd,
        sameSite: (isProd ? "none" : "lax") as "none" | "lax" | "strict",
        path: "/",
      };

      res.clearCookie("access_token", cookieBase);
      res.clearCookie("refresh_token", cookieBase);

      res.json({
        success: true,
        message: "Logout exitoso",
      });

      await AuditService.log({
        actor: (req as any).user,
        action: "LOGOUT",
        entity: "app_user",
        entityId: (req as any).user?.iduser || null,
        before: null,
        after: null,
        ...getRequestMeta(req),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Error en logout",
      });
    }
  },
);

/**
 * POST /api/auth/refresh-token
 * Valida y renueva el token
 */
router.post(
  "/refresh-token",
  async (req: Request, res: Response) => {
    try {
      const refreshToken = (req as any).cookies?.refresh_token;
      const result = await AuthService.refreshTokens(refreshToken);
      if (!result.success) {
        return res.status(401).json(result);
      }

      const isProd = process.env.NODE_ENV === "production";
      const cookieBase = {
        httpOnly: true,
        secure: isProd,
        sameSite: (isProd ? "none" : "lax") as "none" | "lax" | "strict",
        path: "/",
      };

      res.cookie("access_token", result.token, {
        ...cookieBase,
        maxAge: 15 * 60 * 1000,
      });
      res.cookie("refresh_token", result.refreshToken, {
        ...cookieBase,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        userData: result.userData || result.user,
        message: "Token renovado",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Error validando token",
      });
    }
  },
);

export default router;
