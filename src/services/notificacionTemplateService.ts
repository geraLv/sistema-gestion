const variableRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

const toDisplayDate = (date?: string): string => {
  if (!date) return "";
  const [yyyy, mm, dd] = date.slice(0, 10).split("-");
  if (!yyyy || !mm || !dd) return date;
  return `${dd}/${mm}/${yyyy}`;
};

const toDisplayAmount = (value?: number): string => {
  if (value == null || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const safeValue = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "number") return `${value}`;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

export interface TemplateRenderInput {
  clienteNombre: string;
  clienteDni: string;
  nroSolicitud?: string;
  nroCuota?: number;
  importe?: number;
  fechaVencimiento?: string;
  fechaNacimiento?: string;
}

export interface RenderedTemplate {
  subject: string;
  body: string;
}

export class NotificacionTemplateService {
  static render(
    subjectTemplate: string,
    bodyTemplate: string,
    input: TemplateRenderInput,
  ): RenderedTemplate {
    const context: Record<string, string> = {
      clienteNombre: input.clienteNombre,
      clienteDni: input.clienteDni,
      nroSolicitud: input.nroSolicitud || "",
      nroCuota: input.nroCuota != null ? `${input.nroCuota}` : "",
      importe: toDisplayAmount(input.importe),
      fechaVencimiento: toDisplayDate(input.fechaVencimiento),
      fechaNacimiento: toDisplayDate(input.fechaNacimiento),
    };

    const apply = (template: string) =>
      template.replace(variableRegex, (_match, key) => safeValue(context[key]));

    return {
      subject: apply(subjectTemplate),
      body: apply(bodyTemplate),
    };
  }
}
