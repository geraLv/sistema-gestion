import "dotenv/config";
import { NotificacionService } from "../services/notificacionService";
import logger from "../utils/logger";

const extractDateArg = (): string | undefined => {
  const arg = process.argv.find((value) => value.startsWith("--date="));
  if (!arg) return undefined;
  const value = arg.split("=")[1];
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Formato invalido para --date. Usa YYYY-MM-DD");
  }
  return value;
};

const run = async () => {
  const runDate = extractDateArg();
  const summary = await NotificacionService.runDailyProcess({ runDate });

  console.log("=== Resumen notificaciones ===");
  console.log(`Fecha de corrida: ${summary.runDate}`);
  console.log(`Candidatos detectados: ${summary.candidates}`);
  console.log(`Jobs nuevos: ${summary.jobsCreated}`);
  console.log(`Jobs omitidos por idempotencia: ${summary.jobsSkippedByIdempotency}`);
  console.log(`Enviados: ${summary.jobsSent}`);
  console.log(`Reintentos programados: ${summary.jobsRetried}`);
  console.log(`Marcados dead: ${summary.jobsDead}`);
  console.log(`Fallos no controlados: ${summary.jobsFailed}`);
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("Fallo el job diario de notificaciones", {
      error: error instanceof Error ? error.message : String(error),
    });
    console.error("Error ejecutando notificaciones:", error);
    process.exit(1);
  });
