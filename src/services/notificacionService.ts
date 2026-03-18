import { randomUUID } from "crypto";
import { NotificacionRepository } from "../repositories/notificacionRepository";
import {
  NotificationCandidate,
  NotificationDispatchJob,
  NotificationInsertJob,
  NotificationRunSummary,
  NotificationTypeCode,
} from "../types/notificacion";
import { EmailProviderError, EmailService } from "./emailService";
import { NotificacionTemplateService } from "./notificacionTemplateService";
import logger from "../utils/logger";

interface RunNotificationsOptions {
  runDate?: string;
}

interface DispatchSummary {
  sent: number;
  retried: number;
  dead: number;
  failed: number;
}

const RETRY_BACKOFF_MINUTES = [5, 30, 120, 720];

const formatDateInTimezone = (timeZone: string): string => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) {
    return new Date().toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
};

const safeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const nextRetryAt = (attemptNumber: number): Date => {
  const backoff =
    RETRY_BACKOFF_MINUTES[Math.min(attemptNumber - 1, RETRY_BACKOFF_MINUTES.length - 1)];
  const next = new Date();
  next.setMinutes(next.getMinutes() + backoff);
  return next;
};

const isBirthdayEnabled = (): boolean =>
  (process.env.NOTIFICATION_ENABLE_BIRTHDAY || "false").toLowerCase() === "true";

const maxDispatchPerRun = (): number => {
  const value = Number(process.env.NOTIFICATION_MAX_DISPATCH_PER_RUN || "300");
  if (!Number.isFinite(value) || value <= 0) return 300;
  return Math.floor(value);
};

const makeIdempotencyKey = (
  candidate: NotificationCandidate,
  runDate: string,
): string => {
  if (candidate.tipoCodigo === "BIRTHDAY") {
    const year = runDate.slice(0, 4);
    return `EMAIL:${candidate.tipoCodigo}:CLIENTE:${candidate.idcliente}:YEAR:${year}`;
  }

  return `EMAIL:${candidate.tipoCodigo}:CUOTA:${candidate.idcuota}:VTO:${candidate.fechaVencimiento}`;
};

const candidateToMetadata = (
  candidate: NotificationCandidate,
): Record<string, unknown> => {
  if (candidate.tipoCodigo === "BIRTHDAY") {
    return {
      tipo: candidate.tipoCodigo,
      fechaNacimiento: candidate.fechaNacimiento,
      clienteDni: candidate.clienteDni,
    };
  }

  return {
    tipo: candidate.tipoCodigo,
    idcuota: candidate.idcuota,
    importe: candidate.importe,
    fechaVencimiento: candidate.fechaVencimiento,
    nroSolicitud: candidate.nroSolicitud || null,
    nroCuota: candidate.nroCuota || null,
    clienteDni: candidate.clienteDni,
  };
};

export class NotificacionService {
  static async runDailyProcess(
    options: RunNotificationsOptions = {},
  ): Promise<NotificationRunSummary> {
    const runDate =
      options.runDate ||
      formatDateInTimezone(
        process.env.NOTIFICATION_TIMEZONE || "America/Argentina/Buenos_Aires",
      );

    const activeTypes = await NotificacionRepository.getActiveTypes();
    const typeIdByCode = new Map<NotificationTypeCode, number>();
    activeTypes.forEach((type) => {
      typeIdByCode.set(type.codigo, type.idtipo);
    });

    if (typeIdByCode.size === 0) {
      throw new Error(
        "No hay tipos de notificacion activos. Ejecuta el schema_notificaciones.sql.",
      );
    }

    const cuotaCandidates = await NotificacionRepository.getCuotaCandidates(runDate);
    const birthdayCandidates =
      isBirthdayEnabled() && typeIdByCode.has("BIRTHDAY")
        ? await NotificacionRepository.getBirthdayCandidates(runDate)
        : [];

    const allCandidates = [...cuotaCandidates, ...birthdayCandidates].filter((c) =>
      typeIdByCode.has(c.tipoCodigo),
    );

    const jobs: NotificationInsertJob[] = allCandidates.map((candidate) => {
      const typeId = typeIdByCode.get(candidate.tipoCodigo);
      if (!typeId) {
        throw new Error(`Tipo de notificacion no encontrado: ${candidate.tipoCodigo}`);
      }

      const cuotaId = candidate.tipoCodigo === "BIRTHDAY" ? null : candidate.idcuota;
      const targetDate =
        candidate.tipoCodigo === "BIRTHDAY"
          ? null
          : candidate.fechaVencimiento;

      return {
        rel_tipo: typeId,
        canal: "email",
        rel_cuota: cuotaId,
        rel_cliente: candidate.idcliente,
        fecha_programada: runDate,
        fecha_objetivo: targetDate,
        idempotency_key: makeIdempotencyKey(candidate, runDate),
        metadata: candidateToMetadata(candidate),
      };
    });

    const { created, skipped } = await NotificacionRepository.upsertNotificationJobs(
      jobs,
    );

    const dispatchSummary = await this.dispatchReadyJobs(
      maxDispatchPerRun(),
      runDate,
    );

    const summary: NotificationRunSummary = {
      runDate,
      candidates: allCandidates.length,
      jobsCreated: created,
      jobsSkippedByIdempotency: skipped,
      jobsSent: dispatchSummary.sent,
      jobsRetried: dispatchSummary.retried,
      jobsDead: dispatchSummary.dead,
      jobsFailed: dispatchSummary.failed,
    };

    logger.info("Notificaciones diarias procesadas", summary);
    return summary;
  }

  private static async dispatchReadyJobs(
    limit: number,
    runDate: string,
  ): Promise<DispatchSummary> {
    const jobs = await NotificacionRepository.fetchReadyJobs(limit);
    const summary: DispatchSummary = { sent: 0, retried: 0, dead: 0, failed: 0 };

    for (const job of jobs) {
      const workerToken = randomUUID();

      try {
        const claimed = await NotificacionRepository.claimJobForProcessing(
          job.idenvio,
          workerToken,
        );

        if (!claimed) {
          continue;
        }

        await this.dispatchOneJob(job, runDate, summary);
      } catch (error) {
        summary.failed += 1;
        logger.error("Error procesando job de notificacion", {
          idenvio: job.idenvio,
          error: safeErrorMessage(error),
        });
      }
    }

    return summary;
  }

  private static async dispatchOneJob(
    job: NotificationDispatchJob,
    runDate: string,
    summary: DispatchSummary,
  ): Promise<void> {
    const attemptNumber = job.intentos + 1;
    const template = await NotificacionRepository.getActiveTemplateByTypeId(
      job.rel_tipo,
    );

    if (!template) {
      await NotificacionRepository.markDead(
        job.idenvio,
        attemptNumber,
        "Plantilla activa no encontrada",
      );
      await NotificacionRepository.addEvent(job.idenvio, "dead", {
        reason: "template_not_found",
      });
      summary.dead += 1;
      return;
    }

    if (!job.clienteEmail || !job.clienteEmail.includes("@")) {
      await NotificacionRepository.markDead(
        job.idenvio,
        attemptNumber,
        "Email del cliente invalido",
      );
      await NotificacionRepository.addEvent(job.idenvio, "dead", {
        reason: "invalid_email",
      });
      summary.dead += 1;
      return;
    }

    const rendered = NotificacionTemplateService.render(
      template.asunto_template,
      template.cuerpo_template,
      {
        clienteNombre: job.clienteNombre,
        clienteDni: job.clienteDni,
        nroSolicitud: job.nroSolicitud,
        nroCuota: job.nroCuota,
        importe: job.importe,
        fechaVencimiento: job.fechaVencimiento,
        fechaNacimiento:
          typeof job.metadata.fechaNacimiento === "string"
            ? job.metadata.fechaNacimiento
            : undefined,
      },
    );

    try {
      const result = await EmailService.sendEmail({
        to: job.clienteEmail,
        subject: rendered.subject,
        text: rendered.body,
      });

      await NotificacionRepository.markSent(job.idenvio, result.providerMessageId);
      await NotificacionRepository.addEvent(job.idenvio, "sent", {
        attempt: attemptNumber,
        providerMessageId: result.providerMessageId || null,
      });

      summary.sent += 1;
    } catch (error) {
      const providerError =
        error instanceof EmailProviderError
          ? error
          : new EmailProviderError(safeErrorMessage(error), true);

      const message = providerError.message.slice(0, 1800);

      if (!providerError.transient || attemptNumber >= job.max_intentos) {
        await NotificacionRepository.markDead(job.idenvio, attemptNumber, message);
        await NotificacionRepository.addEvent(job.idenvio, "dead", {
          attempt: attemptNumber,
          transient: providerError.transient,
          statusCode: providerError.statusCode || null,
          error: message,
        });
        summary.dead += 1;
        return;
      }

      const retryAt = nextRetryAt(attemptNumber);
      await NotificacionRepository.scheduleRetry(
        job.idenvio,
        attemptNumber,
        retryAt,
        message,
      );
      await NotificacionRepository.addEvent(job.idenvio, "retry_scheduled", {
        attempt: attemptNumber,
        retryAt: retryAt.toISOString(),
        statusCode: providerError.statusCode || null,
        error: message,
      });
      summary.retried += 1;
    }
  }
}
