import { describe, expect, it } from "vitest";
import { extractReciboFirmaData } from "../src/utils/reciboFirma";

const ONE_PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+0m8AAAAASUVORK5CYII=";

describe("extractReciboFirmaData", () => {
  it("retorna undefined cuando no se envía firma ni aclaración", () => {
    expect(extractReciboFirmaData({})).toBeUndefined();
  });

  it("falla si llega aclaración sin firma", () => {
    expect(() =>
      extractReciboFirmaData({ aclaracionProductor: "Juan Perez" }),
    ).toThrow("aclaración sin firma");
  });

  it("normaliza aclaración y acepta firma PNG válida", () => {
    const parsed = extractReciboFirmaData({
      firmaProductor: ONE_PIXEL_PNG,
      aclaracionProductor: "  Juan   Perez  ",
    });

    expect(parsed).toBeDefined();
    expect(parsed?.mimeType).toBe("image/png");
    expect(parsed?.aclaracion).toBe("Juan Perez");
    expect(parsed?.sizeBytes).toBeGreaterThan(0);
  });

  it("rechaza mime type inválido", () => {
    expect(() =>
      extractReciboFirmaData({
        firmaProductor: "data:text/plain;base64,SG9sYQ==",
        aclaracionProductor: "Juan Perez",
      }),
    ).toThrow("Formato de firma inválido");
  });
});
