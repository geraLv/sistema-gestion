import { supabase } from "../db";
import {
  BirthdayNotificationCandidate,
  CuotaNotificationCandidate,
  NotificationDispatchJob,
  NotificationInsertJob,
  NotificationTemplateRow,
  NotificationTypeCode,
  NotificationTypeRow,
} from "../types/notificacion";

const toDateOnly = (value: string): string => String(value).slice(0, 10);

const parseDateUtc = (value: string): Date => {
  const dateOnly = toDateOnly(value);
  return new Date(`${dateOnly}T00:00:00.000Z`);
};

const diffDays = (fromDate: string, toDate: string): number => {
  const from = parseDateUtc(fromDate);
  const to = parseDateUtc(toDate);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
};

const normalizeEmail = (email?: string | null): string | null => {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

export class NotificacionRepository {
  static async getActiveTypes(
    codes?: NotificationTypeCode[],
  ): Promise<NotificationTypeRow[]> {
    let query = supabase
      .from("notificacion_tipo")
      .select("idtipo, codigo, descripcion, activo")
      .eq("activo", true);

    if (codes && codes.length > 0) {
      query = query.in("codigo", codes);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error obteniendo tipos de notificacion: ${error.message}`);
    }

    return (data || []) as NotificationTypeRow[];
  }

  static async getActiveTemplateByTypeId(
    typeId: number,
    locale = "es-AR",
  ): Promise<NotificationTemplateRow | null> {
    const { data, error } = await supabase
      .from("notificacion_plantilla")
      .select(
        "idplantilla, rel_tipo, canal, asunto_template, cuerpo_template, locale, version, activo",
      )
      .eq("rel_tipo", typeId)
      .eq("canal", "email")
      .eq("activo", true)
      .order("version", { ascending: false });

    if (error) {
      throw new Error(`Error obteniendo plantilla de notificacion: ${error.message}`);
    }

    const templates = (data || []) as NotificationTemplateRow[];
    if (templates.length === 0) {
      return null;
    }

    const exactLocale = templates.find((tpl) => tpl.locale === locale);
    return exactLocale || templates[0];
  }

  static async getCuotaCandidates(
    runDate: string,
  ): Promise<CuotaNotificationCandidate[]> {
    const { data, error } = await supabase
      .from("cuotas")
      .select(
        `
        idcuota, relasolicitud, nrocuota, importe, vencimiento, estado,
        solicitud:relasolicitud(
          nrosolicitud,
          relacliente,
          cliente:relacliente(idcliente, appynom, email, dni)
        )
      `,
      )
      .eq("estado", 0)
      .not("vencimiento", "is", null);

    if (error) {
      throw new Error(
        `Error obteniendo cuotas candidatas a notificacion: ${error.message}`,
      );
    }

    const rows = (data || []) as any[];
    const candidates: CuotaNotificationCandidate[] = [];

    for (const row of rows) {
      const solicitud = row.solicitud as any;
      const cliente = solicitud?.cliente as any;
      const email = normalizeEmail(cliente?.email);
      if (!email) continue;

      const fechaVencimiento = toDateOnly(row.vencimiento);
      const daysToDue = diffDays(runDate, fechaVencimiento);

      let tipoCodigo: CuotaNotificationCandidate["tipoCodigo"] | null = null;
      if (daysToDue === 3) tipoCodigo = "DUE_IN_3_DAYS";
      if (daysToDue === 1) tipoCodigo = "DUE_TOMORROW";
      if (daysToDue < 0) tipoCodigo = "OVERDUE";
      if (!tipoCodigo) continue;

      candidates.push({
        tipoCodigo,
        idcuota: Number(row.idcuota),
        idcliente: Number(cliente?.idcliente ?? solicitud?.relacliente),
        clienteNombre: String(cliente?.appynom || "Cliente"),
        clienteEmail: email,
        clienteDni: String(cliente?.dni || ""),
        nroSolicitud: solicitud?.nrosolicitud
          ? String(solicitud.nrosolicitud)
          : undefined,
        nroCuota: Number.isFinite(Number(row.nrocuota))
          ? Number(row.nrocuota)
          : undefined,
        importe: Number(row.importe || 0),
        fechaVencimiento,
      });
    }

    return candidates;
  }

  static async getBirthdayCandidates(
    runDate: string,
  ): Promise<BirthdayNotificationCandidate[]> {
    const { data, error } = await supabase
      .from("cliente")
      .select("idcliente, appynom, email, dni, fecha_nacimiento")
      .not("fecha_nacimiento", "is", null)
      .not("email", "is", null);

    if (error) {
      throw new Error(
        `Error obteniendo clientes para notificacion de cumpleanos: ${error.message}`,
      );
    }

    const run = parseDateUtc(runDate);
    const runMonth = run.getUTCMonth() + 1;
    const runDay = run.getUTCDate();
    const rows = (data || []) as any[];
    const candidates: BirthdayNotificationCandidate[] = [];

    for (const row of rows) {
      const email = normalizeEmail(row.email);
      if (!email) continue;

      const birthRaw = row.fecha_nacimiento as string;
      if (!birthRaw) continue;

      const birth = parseDateUtc(birthRaw);
      const birthMonth = birth.getUTCMonth() + 1;
      const birthDay = birth.getUTCDate();
      if (birthMonth !== runMonth || birthDay !== runDay) continue;

      candidates.push({
        tipoCodigo: "BIRTHDAY",
        idcliente: Number(row.idcliente),
        clienteNombre: String(row.appynom || "Cliente"),
        clienteEmail: email,
        clienteDni: String(row.dni || ""),
        fechaNacimiento: toDateOnly(birthRaw),
      });
    }

    return candidates;
  }

  static async upsertNotificationJobs(
    jobs: NotificationInsertJob[],
  ): Promise<{ created: number; skipped: number }> {
    if (jobs.length === 0) {
      return { created: 0, skipped: 0 };
    }

    const { data, error } = await supabase
      .from("notificacion_envio")
      .upsert(jobs, { onConflict: "idempotency_key", ignoreDuplicates: true })
      .select("idenvio");

    if (error) {
      throw new Error(`Error creando jobs de notificacion: ${error.message}`);
    }

    const created = (data || []).length;
    return { created, skipped: jobs.length - created };
  }

  static async fetchReadyJobs(limit: number): Promise<NotificationDispatchJob[]> {
    const safeLimit = Math.max(limit, 1);
    const now = new Date();

    const { data, error } = await supabase
      .from("notificacion_envio")
      .select(
        `
        idenvio, rel_tipo, canal, rel_cuota, rel_cliente, fecha_programada, fecha_objetivo,
        estado, intentos, max_intentos, proximo_intento, idempotency_key, metadata,
        tipo:rel_tipo(codigo),
        cliente:rel_cliente(idcliente, appynom, email, dni),
        cuota:rel_cuota(idcuota, nrocuota, importe, vencimiento, solicitud:relasolicitud(nrosolicitud))
      `,
      )
      .in("estado", ["pending", "failed"])
      .order("created_at", { ascending: true })
      .limit(safeLimit * 5);

    if (error) {
      throw new Error(`Error obteniendo jobs de notificacion: ${error.message}`);
    }

    const rows = (data || []) as any[];
    const readyRows = rows.filter((row) => {
      if (!row.proximo_intento) return true;
      return new Date(row.proximo_intento).getTime() <= now.getTime();
    });

    return readyRows.slice(0, safeLimit).map((row) => {
      const tipo = row.tipo as any;
      const cliente = row.cliente as any;
      const cuota = row.cuota as any;
      const solicitud = cuota?.solicitud as any;
      return {
        idenvio: Number(row.idenvio),
        rel_tipo: Number(row.rel_tipo),
        canal: "email",
        rel_cuota: row.rel_cuota != null ? Number(row.rel_cuota) : null,
        rel_cliente: Number(row.rel_cliente),
        fecha_programada: toDateOnly(row.fecha_programada),
        fecha_objetivo: row.fecha_objetivo ? toDateOnly(row.fecha_objetivo) : null,
        estado: row.estado,
        intentos: Number(row.intentos || 0),
        max_intentos: Number(row.max_intentos || 4),
        proximo_intento: row.proximo_intento,
        idempotency_key: String(row.idempotency_key),
        metadata: (row.metadata || {}) as Record<string, unknown>,
        tipoCodigo: tipo?.codigo as NotificationTypeCode,
        clienteNombre: String(cliente?.appynom || "Cliente"),
        clienteEmail: String(cliente?.email || ""),
        clienteDni: String(cliente?.dni || ""),
        nroSolicitud: solicitud?.nrosolicitud
          ? String(solicitud.nrosolicitud)
          : undefined,
        nroCuota: Number.isFinite(Number(cuota?.nrocuota))
          ? Number(cuota.nrocuota)
          : undefined,
        importe: Number.isFinite(Number(cuota?.importe))
          ? Number(cuota.importe)
          : undefined,
        fechaVencimiento: cuota?.vencimiento
          ? toDateOnly(cuota.vencimiento)
          : undefined,
      } as NotificationDispatchJob;
    });
  }

  static async claimJobForProcessing(
    idEnvio: number,
    workerToken: string,
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from("notificacion_envio")
      .update({
        estado: "processing",
        lock_token: workerToken,
        lock_at: new Date().toISOString(),
        ultimo_error: null,
      })
      .eq("idenvio", idEnvio)
      .in("estado", ["pending", "failed"])
      .select("idenvio");

    if (error) {
      throw new Error(`Error reclamando job ${idEnvio}: ${error.message}`);
    }

    return (data || []).length > 0;
  }

  static async markSent(
    idEnvio: number,
    providerMessageId?: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("notificacion_envio")
      .update({
        estado: "sent",
        sent_at: new Date().toISOString(),
        provider_message_id: providerMessageId || null,
        lock_token: null,
        lock_at: null,
        ultimo_error: null,
      })
      .eq("idenvio", idEnvio);

    if (error) {
      throw new Error(`Error marcando envio ${idEnvio} como enviado: ${error.message}`);
    }
  }

  static async scheduleRetry(
    idEnvio: number,
    attempts: number,
    nextAttemptAt: Date,
    lastError: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("notificacion_envio")
      .update({
        estado: "failed",
        intentos: attempts,
        proximo_intento: nextAttemptAt.toISOString(),
        ultimo_error: lastError,
        lock_token: null,
        lock_at: null,
      })
      .eq("idenvio", idEnvio);

    if (error) {
      throw new Error(
        `Error programando reintento para envio ${idEnvio}: ${error.message}`,
      );
    }
  }

  static async markDead(
    idEnvio: number,
    attempts: number,
    lastError: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("notificacion_envio")
      .update({
        estado: "dead",
        intentos: attempts,
        ultimo_error: lastError,
        lock_token: null,
        lock_at: null,
      })
      .eq("idenvio", idEnvio);

    if (error) {
      throw new Error(`Error marcando envio ${idEnvio} como dead: ${error.message}`);
    }
  }

  static async addEvent(
    idEnvio: number,
    tipoEvento: string,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    const { error } = await supabase.from("notificacion_evento").insert({
      rel_envio: idEnvio,
      tipo_evento: tipoEvento,
      payload,
    });

    if (error) {
      throw new Error(`Error registrando evento de notificacion: ${error.message}`);
    }
  }
}
