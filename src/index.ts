import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { json } from "body-parser";
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

dotenv.config();

const app = express();
app.use(cors());
app.use(json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/clientes", authenticateToken, clientesRouter);
app.use("/api/localidades", authenticateToken, localidadesRouter);
app.use("/api/solicitudes", authenticateToken, solicitudesRouter);
app.use("/api/cuotas", authenticateToken, cuotasRouter);
app.use("/api/adelantos", authenticateToken, adelantosRouter);
app.use("/api/vendedores", authenticateToken, vendedoresRouter);
app.use("/api/productos", authenticateToken, productosRouter);
app.use("/api/reportes", authenticateToken, reportesRouter);
app.use("/api/admin", authenticateToken, requireRole("admin"), adminRouter);

const port = process.env.PORT || 4000;

// Manejo de errores global
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

const server = app.listen(port, () => {
  console.log(`✓ Backend migrado escuchando en http://localhost:${port}`);
  console.log(`✓ Health check: http://localhost:${port}/health`);
  console.log(`✓ Auth API: http://localhost:${port}/api/auth/login`);
  console.log(
    `✓ Clientes API: http://localhost:${port}/api/clientes (requiere token)`,
  );
  console.log(
    `✓ Localidades API: http://localhost:${port}/api/localidades (requiere token)`,
  );
  console.log(
    `✓ Solicitudes API: http://localhost:${port}/api/solicitudes (requiere token)`,
  );
  console.log(
    `✓ Cuotas API: http://localhost:${port}/api/cuotas (requiere token)`,
  );
  console.log(
    `✓ Adelantos API: http://localhost:${port}/api/adelantos (requiere token)`,
  );
  console.log(
    `✓ Vendedores API: http://localhost:${port}/api/vendedores (requiere token)`,
  );
  console.log(
    `✓ Productos API: http://localhost:${port}/api/productos (requiere token)`,
  );
  console.log(`✅ TODOS LOS MÓDULOS MIGRADOS - 30/30 endpoints`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});
