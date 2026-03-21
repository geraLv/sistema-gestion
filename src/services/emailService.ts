export interface SendEmailInput {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SendEmailResult {
  providerMessageId?: string;
}

export class EmailProviderError extends Error {
  statusCode?: number;
  transient: boolean;

  constructor(message: string, transient: boolean, statusCode?: number) {
    super(message);
    this.name = "EmailProviderError";
    this.transient = transient;
    this.statusCode = statusCode;
  }
}

const isTransientStatus = (status: number): boolean =>
  status >= 500 || status === 429;

export class EmailService {
  static async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();

    if (provider !== "resend") {
      throw new EmailProviderError(
        `EMAIL_PROVIDER no soportado: ${provider}`,
        false,
      );
    }

    return this.sendWithResend(input);
  }

  private static async sendWithResend(
    input: SendEmailInput,
  ): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey) {
      throw new EmailProviderError(
        "RESEND_API_KEY no configurada",
        false,
      );
    }

    if (!from) {
      throw new EmailProviderError("EMAIL_FROM no configurado", false);
    }

    let response: Response;

    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html,
        }),
      });
    } catch (error) {
      throw new EmailProviderError(
        `Fallo de red al enviar email: ${(error as Error).message}`,
        true,
      );
    }

    const responseText = await response.text();
    let payload: any = {};
    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch {
      payload = { raw: responseText };
    }

    if (!response.ok) {
      const message = payload?.message || payload?.error || response.statusText;
      throw new EmailProviderError(
        `Resend ${response.status}: ${message}`,
        isTransientStatus(response.status),
        response.status,
      );
    }

    return {
      providerMessageId: payload?.id ? String(payload.id) : undefined,
    };
  }
}
