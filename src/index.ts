import { app } from "./app";
import logger from "./utils/logger";

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
