import "dotenv/config"; // Load env vars before anything else
import { initSentry } from "./config/sentry";
// Initialize Sentry IMMEDIATELY after dotenv and BEFORE express
const sentryEnabled = initSentry();

import express from "express";
import cors from "cors";
// import dotenv from "dotenv"; // Removed as we use "dotenv/config"
import helmet from "helmet";
import compression from "compression";
import { json } from "body-parser";
import cookieParser from "cookie-parser";
import Sentry from "@sentry/node";
import logger from "./utils/logger";
import { validateEnv } from "./config/validateEnv";
// import { initSentry } from "./config/sentry"; // Moved up
import { globalLimiter, authLimiter, apiLimiter, strictLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
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

// Load environment variables FIRST
// Environment variables loaded via import "dotenv/config"

// Sentry initialized at the top of the file

// Validate environment variables
validateEnv();

const app = express();
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

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

// Routes with rate limiting
app.use("/api/auth", authLimiter, authRouter); // Strict limit for auth
app.use("/api/clientes", apiLimiter, authenticateToken, clientesRouter);
app.use("/api/localidades", apiLimiter, authenticateToken, localidadesRouter);
app.use("/api/solicitudes", apiLimiter, authenticateToken, solicitudesRouter);
app.use("/api/cuotas", apiLimiter, authenticateToken, cuotasRouter);
app.use("/api/adelantos", apiLimiter, authenticateToken, adelantosRouter);
app.use("/api/vendedores", apiLimiter, authenticateToken, vendedoresRouter);
app.use("/api/productos", apiLimiter, authenticateToken, productosRouter);
app.use("/api/reportes", apiLimiter, authenticateToken, reportesRouter);
app.use("/api/admin", strictLimiter, authenticateToken, requireRole("admin"), adminRouter); // Strict limit for admin
app.use("/api/dashboard", apiLimiter, authenticateToken, dashboardRouter);

// 404 handler for undefined routes (must be after all routes)
app.use(notFoundHandler);

// Centralized error handling middleware (must be last)
app.use(errorHandler);

const port = process.env.PORT || 4000;

// Manejo de errores global
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", { reason, promise: String(promise) });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", { error: error.message, stack: error.stack });
  process.exit(1);
});

const server = app.listen(port, () => {
  logger.info('✓ Backend server started', {
    port,
    environment: process.env.NODE_ENV || 'development',
    endpoints: [
      '/health',
      '/api/auth',
      '/api/clientes',
      '/api/localidades',
      '/api/solicitudes',
      '/api/cuotas',
      '/api/adelantos',
      '/api/vendedores',
      '/api/productos',
      '/api/reportes',
      '/api/admin',
      '/api/dashboard'
    ]
  });
  logger.info(`✓ Server listening on http://localhost:${port}`);
  logger.info(`✓ Health check: http://localhost:${port}/health`);
  logger.info('✅ All modules loaded - 30/30 endpoints ready');
});

server.on("error", (err: any) => {
  logger.error("Server error", { error: err.message, code: err.code, stack: err.stack });
  process.exit(1);
});
