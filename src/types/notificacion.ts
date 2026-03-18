export type NotificationTypeCode =
  | "DUE_IN_3_DAYS"
  | "DUE_TOMORROW"
  | "OVERDUE"
  | "BIRTHDAY";

export type NotificationStatus =
  | "pending"
  | "processing"
  | "failed"
  | "sent"
  | "dead";

export interface NotificationTypeRow {
  idtipo: number;
  codigo: NotificationTypeCode;
  descripcion: string;
  activo: boolean;
}

export interface NotificationTemplateRow {
  idplantilla: number;
  rel_tipo: number;
  canal: "email";
  asunto_template: string;
  cuerpo_template: string;
  locale: string;
  version: number;
  activo: boolean;
}

export interface CuotaNotificationCandidate {
  tipoCodigo: Exclude<NotificationTypeCode, "BIRTHDAY">;
  idcuota: number;
  idcliente: number;
  clienteNombre: string;
  clienteEmail: string;
  clienteDni: string;
  nroSolicitud?: string;
  nroCuota?: number;
  importe: number;
  fechaVencimiento: string;
}

export interface BirthdayNotificationCandidate {
  tipoCodigo: "BIRTHDAY";
  idcliente: number;
  clienteNombre: string;
  clienteEmail: string;
  clienteDni: string;
  fechaNacimiento: string;
}

export type NotificationCandidate =
  | CuotaNotificationCandidate
  | BirthdayNotificationCandidate;

export interface NotificationInsertJob {
  rel_tipo: number;
  canal: "email";
  rel_cuota: number | null;
  rel_cliente: number;
  fecha_programada: string;
  fecha_objetivo: string | null;
  idempotency_key: string;
  metadata: Record<string, unknown>;
}

export interface NotificationDispatchJob {
  idenvio: number;
  rel_tipo: number;
  canal: "email";
  rel_cuota: number | null;
  rel_cliente: number;
  fecha_programada: string;
  fecha_objetivo: string | null;
  estado: NotificationStatus;
  intentos: number;
  max_intentos: number;
  proximo_intento: string | null;
  idempotency_key: string;
  metadata: Record<string, unknown>;
  tipoCodigo: NotificationTypeCode;
  clienteNombre: string;
  clienteEmail: string;
  clienteDni: string;
  nroSolicitud?: string;
  nroCuota?: number;
  importe?: number;
  fechaVencimiento?: string;
}

export interface NotificationRunSummary {
  runDate: string;
  candidates: number;
  jobsCreated: number;
  jobsSkippedByIdempotency: number;
  jobsSent: number;
  jobsRetried: number;
  jobsDead: number;
  jobsFailed: number;
}
