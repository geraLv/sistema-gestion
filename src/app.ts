import "dotenv/config";
import { initSentry } from "./config/sentry";

const sentryEnabled = initSentry();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { json } from "body-parser";
import cookieParser from "cookie-parser";
import Sentry from "@sentry/node";
import { validateEnv } from "./config/validateEnv";
import { globalLimiter, authLimiter, apiLimiter, strictLimiter, portalLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

// Routes imports
import authRouter, { authenticateToken, requireRole } from "./routes/auth";
import clientesRouter from "./routes/clientes";
import localidadesRouter from "./routes/localidades";
import solicitudesRouter from "./routes/solicitudes";
import cuotasRouter from "./routes/cuotas";
import adelantosRouter from "./routes/adelantos";
import vendedoresRouter from "./routes/vendedores";
import productosRouter from "./routes/productos";
import reportesRouter from "./routes/reportes";
import adminRouter from "./routes/admin";
import dashboardRouter from "./routes/dashboard";
import portalClienteRouter from "./routes/portalCliente";

// Validate environment variables
validateEnv();

export const app = express();
app.set("trust proxy", 1); // Trust first proxy (Render Load Balancer)

const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://localhost:3000"];

console.log("Allowed CORS Origins:", corsOrigin);

// Sentry request handler - MUST BE FIRST middleware (only if enabled)
if (sentryEnabled) {
    Sentry.setupExpressErrorHandler(app);
}

// Security middleware (must be first)
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);

// Compression
app.use(compression());

// Global rate limiter
app.use(globalLimiter);

// CORS
app.use(
    cors({
        origin: corsOrigin,
        credentials: true,
    }),
);

// Body parsing
app.use(cookieParser());
app.use(json());

// Health check (no auth required)
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes with rate limiting
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/clientes", apiLimiter, authenticateToken, clientesRouter);
app.use("/api/localidades", apiLimiter, authenticateToken, localidadesRouter);
app.use("/api/solicitudes", apiLimiter, authenticateToken, solicitudesRouter);
app.use("/api/cuotas", apiLimiter, authenticateToken, cuotasRouter);
app.use("/api/adelantos", apiLimiter, authenticateToken, adelantosRouter);
app.use("/api/vendedores", apiLimiter, authenticateToken, vendedoresRouter);
app.use("/api/productos", apiLimiter, authenticateToken, productosRouter);
app.use("/api/reportes", apiLimiter, authenticateToken, reportesRouter);
app.use("/api/admin", strictLimiter, authenticateToken, requireRole("admin"), adminRouter);
app.use("/api/dashboard", apiLimiter, authenticateToken, dashboardRouter);
app.use("/api/portal", portalLimiter, portalClienteRouter);

// 404 handler for undefined routes (must be after all routes)
app.use(notFoundHandler);

// Centralized error handling middleware (must be last)
app.use(errorHandler);
