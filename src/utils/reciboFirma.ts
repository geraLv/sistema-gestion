import { ValidationError } from "./errors";

export interface ReciboFirmaData {
  firmaBuffer: Buffer;
  aclaracion: string;
  mimeType: "image/png" | "image/jpeg";
  sizeBytes: number;
}

const SIGNATURE_DATA_URL_REGEX =
  /^data:(image\/png|image\/jpeg);base64,([A-Za-z0-9+/=\s]+)$/i;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const DEFAULT_MAX_SIGNATURE_BYTES = 350_000;
const DEFAULT_MIN_ACLARACION_LENGTH = 3;
const DEFAULT_MAX_ACLARACION_LENGTH = 80;

const readPositiveInt = (raw: string | undefined, fallbackValue: number) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return Math.floor(parsed);
};

const MAX_SIGNATURE_BYTES = readPositiveInt(
  process.env.RECIBO_SIGNATURE_MAX_BYTES,
  DEFAULT_MAX_SIGNATURE_BYTES,
);
const MIN_ACLARACION_LENGTH = readPositiveInt(
  process.env.RECIBO_ACLARACION_MIN_LENGTH,
  DEFAULT_MIN_ACLARACION_LENGTH,
);
const MAX_ACLARACION_LENGTH = readPositiveInt(
  process.env.RECIBO_ACLARACION_MAX_LENGTH,
  DEFAULT_MAX_ACLARACION_LENGTH,
);

const normalizeAclaracion = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .trim();

const estimateDecodedBytes = (base64Data: string) => {
  const padding = base64Data.endsWith("==")
    ? 2
    : base64Data.endsWith("=")
      ? 1
      : 0;
  return Math.floor((base64Data.length * 3) / 4) - padding;
};

const validateMimeSignature = (
  buffer: Buffer,
  mimeType: "image/png" | "image/jpeg",
) => {
  if (mimeType === "image/png") {
    if (buffer.length < PNG_MAGIC.length) {
      return false;
    }
    return buffer.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC);
  }

  if (buffer.length < 4) {
    return false;
  }
  return (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[buffer.length - 2] === 0xff &&
    buffer[buffer.length - 1] === 0xd9
  );
};

const parseDataUrlSignature = (
  rawFirma: string,
  aclaracion: string,
): ReciboFirmaData => {
  const matched = rawFirma.trim().match(SIGNATURE_DATA_URL_REGEX);
  if (!matched) {
    throw new ValidationError(
      "Formato de firma inválido. Use una imagen PNG o JPEG en base64.",
    );
  }

  const mimeType = matched[1].toLowerCase() as "image/png" | "image/jpeg";
  const base64Data = matched[2].replace(/\s+/g, "");

  if (!base64Data || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
    throw new ValidationError("La firma base64 es inválida.");
  }

  if (base64Data.length % 4 !== 0) {
    throw new ValidationError("La firma base64 está mal codificada.");
  }

  const estimatedBytes = estimateDecodedBytes(base64Data);
  if (estimatedBytes <= 0) {
    throw new ValidationError("La firma está vacía.");
  }

  if (estimatedBytes > MAX_SIGNATURE_BYTES) {
    throw new ValidationError(
      `La firma excede el tamaño máximo permitido (${MAX_SIGNATURE_BYTES} bytes).`,
    );
  }

  const firmaBuffer = Buffer.from(base64Data, "base64");
  const normalizedInput = base64Data.replace(/=+$/, "");
  const normalizedDecoded = firmaBuffer.toString("base64").replace(/=+$/, "");

  if (!firmaBuffer.length || normalizedDecoded !== normalizedInput) {
    throw new ValidationError("La firma base64 contiene datos inválidos.");
  }

  if (!validateMimeSignature(firmaBuffer, mimeType)) {
    throw new ValidationError("El contenido de la firma no coincide con su tipo de imagen.");
  }

  return {
    firmaBuffer,
    aclaracion,
    mimeType,
    sizeBytes: firmaBuffer.length,
  };
};

export const extractReciboFirmaData = (
  body: any,
): ReciboFirmaData | undefined => {
  const rawFirma = body?.firmaProductor;
  const rawAclaracion = body?.aclaracionProductor;

  const hasFirma =
    rawFirma !== undefined && rawFirma !== null && String(rawFirma).trim() !== "";
  const hasAclaracion =
    rawAclaracion !== undefined &&
    rawAclaracion !== null &&
    String(rawAclaracion).trim() !== "";

  if (!hasFirma && !hasAclaracion) {
    return undefined;
  }

  if (!hasFirma && hasAclaracion) {
    throw new ValidationError("Se recibió aclaración sin firma.");
  }

  if (typeof rawFirma !== "string") {
    throw new ValidationError("firmaProductor debe ser una cadena base64.");
  }

  if (typeof rawAclaracion !== "string") {
    throw new ValidationError("aclaracionProductor debe ser una cadena.");
  }

  const aclaracion = normalizeAclaracion(rawAclaracion);
  if (!aclaracion) {
    throw new ValidationError("La aclaración del productor es obligatoria.");
  }

  if (aclaracion.length < MIN_ACLARACION_LENGTH) {
    throw new ValidationError(
      `La aclaración debe tener al menos ${MIN_ACLARACION_LENGTH} caracteres.`,
    );
  }

  if (aclaracion.length > MAX_ACLARACION_LENGTH) {
    throw new ValidationError(
      `La aclaración no puede superar ${MAX_ACLARACION_LENGTH} caracteres.`,
    );
  }

  return parseDataUrlSignature(rawFirma, aclaracion);
};
