const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || "America/Argentina/Buenos_Aires";

/**
 * Devuelve la fecha local en formato YYYY-MM-DD para el huso horario indicado.
 */
export function getLocalDateISO(
  date: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("No se pudo formatear la fecha local");
  }

  return `${year}-${month}-${day}`;
}
