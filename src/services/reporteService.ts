import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { ReporteRepository } from "../repositories/reporteRepository";
import { ReciboCuotaData, SolicitudReporteRow } from "../types/reporte";

export class ReporteService {
  static async getReciboCuota(
    idcuota: number,
  ): Promise<ReciboCuotaData | null> {
    return ReporteRepository.getReciboCuotaData(idcuota);
  }

  static async getRecibosMes(
    mes: string,
    localidadId?: number,
  ): Promise<ReciboCuotaData[]> {
    return ReporteRepository.getRecibosMesData(mes, localidadId);
  }

  static async getRecibosSolicitudPagados(
    idsolicitud: number,
  ): Promise<ReciboCuotaData[]> {
    return ReporteRepository.getRecibosSolicitudPagadosData(idsolicitud);
  }

  static async getSolicitudesReporte(
    estado: "impagas" | "pagas" | "bajas",
    mes: string,
    modo: "resumen" | "detalle" = "resumen",
  ): Promise<SolicitudReporteRow[]> {
    return ReporteRepository.getSolicitudesReporteData(estado, mes, modo);
  }

  static async getRecibosMultiples(
    idcuotas: number[],
  ): Promise<ReciboCuotaData[]> {
    return ReporteRepository.getRecibosMultiplesData(idcuotas);
  }

  static renderRecibo(doc: typeof PDFDocument, data: ReciboCuotaData): void {
    // Helper para convertir mm a puntos (1mm approx 2.835 points)
    const mm = (val: number) => val * 2.83465;

    // Helper para dibujar etiqueta y valor en caja
    // FPDF: Cell(w, h, txt, border, ln, align, fill)
    // Aquí simulamos: Label en (x, y), Valor en caja starting at (valX, y)
    const drawField = (
      label: string,
      value: string,
      xMm: number,
      yMm: number,
      valXMm: number,
      widthMm: number,
      heightMm: number = 6,
    ) => {
      const yPt = mm(yMm);
      const valYPt = mm(yMm - 4); // Ajuste visual para alinear con caja

      // Label
      doc
        .font("Times-Bold")
        .fontSize(12)
        .fillColor("#000000")
        .text(label, mm(xMm), yPt);

      // Box
      doc
        .rect(mm(valXMm), mm(yMm - 1), mm(widthMm), mm(heightMm))
        .stroke();

      // Value centered in box
      doc
        .font("Times-Roman")
        .fontSize(12)
        .text(value, mm(valXMm), yPt + 2, {
          width: mm(widthMm),
          align: "center",
        });
    };

    const renderDetalleRecibo = (
      startMmY: number,
      titulo: string,
      isDuplicado: boolean,
    ) => {
      if (isDuplicado) {
        // Raya de corte
        doc
          .moveTo(mm(1), mm(startMmY - 14))
          .lineTo(mm(200), mm(startMmY - 14))
          .dash(5, { space: 5 })
          .stroke()
          .undash();
      }

      // 1. Logo y Encabezado
      const assetsPath = "assets/cred.png";
      const logoY = startMmY;
      try {
        doc.image(assetsPath, mm(20), mm(logoY + 2), { width: mm(29) });
      } catch (e) {
        // ignore
      }

      // Crédito Gestión
      doc
        .font("Helvetica-Bold")
        .fontSize(28)
        .fillColor("#189092")
        .text("Crédito - Gestión", mm(56), mm(logoY + 3));

      // Dirección
      doc
        .font("Times-Roman")
        .fontSize(12)
        .fillColor("#17202A")
        .text(
          "Casa Central: Formosa Capital. Scozzina 445 Bº San Miguel",
          mm(51),
          mm(logoY + 12),
        );

      // Web
      doc
        .fontSize(9)
        .fillColor("#1F9BAF")
        .text("CREDITOGESTION.COM.AR", mm(53), mm(logoY + 17), {
          underline: true,
        });

      // Facebook
      doc
        .fontSize(12)
        .fillColor("#17202A")
        .text("Facebook: credito gestion 1", mm(95), mm(logoY + 17), {
          underline: false,
        });

      // Tel y CUIT
      doc
        .text(
          "Tel: 370-5048282 C.U.I.T: 27-35387794-7",
          mm(60),
          mm(logoY + 22),
        );

      doc.text("Responsable Inscripto", mm(77), mm(logoY + 27));

      // ORIGINAL / DUPLICADO
      doc
        .font("Times-Bold")
        .fontSize(15)
        .fillColor("#B7E7F1")
        .text(titulo, mm(155), mm(logoY + 5));

      // FECHA Box
      // Rect green/blue
      doc
        .fillColor("#B7E7F1")
        .rect(mm(152), mm(logoY + 20), mm(35), mm(8))
        .fill();

      doc.fillColor("#17202A").font("Times-Roman").fontSize(10);
      doc.text("DIA - MES - AÑO", mm(155), mm(logoY + 15));

      const hoy = new Date().toLocaleDateString("es-AR"); // DD/MM/YYYY
      doc
        .font("Times-Bold")
        .fontSize(12)
        .text(hoy, mm(155), mm(logoY + 21)); // Inside box

      // 2. Barra Verde Título
      doc
        .fillColor("#B8EFA3")
        .rect(mm(15), mm(logoY + 36), mm(179), mm(8))
        .fill();

      doc
        .fillColor("#17202A")
        .font("Times-Bold")
        .fontSize(12)
        .text(
          `RECIBO OFICIAL DE COBRANZA. SOLICITUD N° ${data.nrosolicitud || "-"}. CUOTA N°${data.nrocuota}`,
          mm(41),
          mm(logoY + 37),
        );

      // 3. Datos Cliente con Cajas (coords relativas a startY + offset)
      // Ajustamos al PHP:
      // Apellido (y=72 -> +45 from startY=27? No, PHP startY for header text is complex. 
      // PHP: Image at 35(y). Apellido at 72(y). Diff = 37mm.

      // Vamos a usar coordenadas relativas al bloque.
      // PHP block starts roughly at 27mm (Cuadro global).
      // Let's assume startMmY is allow us to shift the whole block.
      // PHP "Original" block starts at Y=27 approx.
      // So if I pass startMmY = 27, I can use PHP coords directly?
      // My renderDetalleRecibo(20) -> PHP Y=27.
      // Logo Y=35 (PHP) -> My Logo Y = startMmY + 8 ?
      // Let's try to map PHP Y to (startMmY + relative).
      // PHP uses Absolute SetXY.

      const rel = (phpY: number) => mm(startMmY + (phpY - 27));

      // Cuadro Global Contenedor
      doc.rect(mm(15), rel(27), mm(179), mm(98)).stroke();

      // Apellido
      drawField("Apellido y Nombre:", data.cliente.appynom || "", 20, 72 - 27 + startMmY, 58, 70);

      // DNI
      drawField("DNI:", data.cliente.dni || "", 133, 72 - 27 + startMmY, 144, 40);

      // Dirección
      drawField("Dirección:", data.cliente.direccion || "", 20, 80 - 27 + startMmY, 41, 85);

      // Provincia (Formosa fixed)
      drawField("Provincia:", "Formosa", 127, 80 - 27 + startMmY, 148, 16);

      // CP
      drawField("C.P:", "3600", 164, 80 - 27 + startMmY, 174, 14);

      // Localidad
      drawField("Localidad:", data.cliente.localidad || "", 20, 88 - 27 + startMmY, 41, 55);

      // Integración
      drawField("Integración para:", data.producto.descripcion || "", 96, 88 - 27 + startMmY, 130, 58);

      // Cel
      drawField("Cel:", data.cliente.telefono || "", 20, 96 - 27 + startMmY, 30, 98);

      // Anticipo
      drawField("Anticipo:", "", 149, 96 - 27 + startMmY, 168, 20);

      // TOTAL
      const totalY = 104 - 27 + startMmY;
      doc
        .font("Times-Bold")
        .fontSize(12)
        .fillColor("#000000") // Asegurar negro
        .text("TOTAL:", mm(135), mm(totalY));

      // Box Total
      doc
        .fillColor("#B7E7F1")
        .rect(mm(153), mm(totalY - 1), mm(34), mm(6))
        .fill();

      // Valor Total
      doc
        .fillColor("#000000")
        .fontSize(14)
        .text(`$${data.importe}`, mm(153), mm(totalY + 1), {
          width: mm(34),
          align: "center",
        });

      // Firmas
      const firmaY = 114 - 27 + startMmY;
      doc.fontSize(9).text("- - - - - - - - - - - - - -", mm(85), mm(firmaY));
      doc.text("FIRMA", mm(93), mm(firmaY + 4));

      doc.text(
        "- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -",
        mm(123),
        mm(firmaY),
      );
      doc.text("ACLARACION", mm(146), mm(firmaY + 4));
    };

    // Render Original (PHP Y approx 27)
    renderDetalleRecibo(27, "ORIGINAL", false);

    // Render Duplicado (PHP Y approx 147)
    renderDetalleRecibo(147, "DUPLICADO", true);
  }

  static renderRecibosMes(
    doc: typeof PDFDocument,
    recibos: ReciboCuotaData[],
    mes: string,
  ): void {
    recibos.forEach((recibo, index) => {
      if (index > 0) {
        doc.addPage();
      }
      doc.fontSize(10).text(`Mes: ${mes}`, { align: "right" });
      this.renderRecibo(doc, recibo);
    });
  }

  static renderRecibosMultiples(
    doc: typeof PDFDocument,
    recibos: ReciboCuotaData[],
  ): void {
    recibos.forEach((recibo, index) => {
      if (index > 0) {
        doc.addPage();
      }
      this.renderRecibo(doc, recibo);
    });
  }

  static renderRecibosSolicitudPagados(
    doc: typeof PDFDocument,
    recibos: ReciboCuotaData[],
  ): void {
    recibos.forEach((recibo, index) => {
      if (index > 0) {
        doc.addPage();
      }
      this.renderRecibo(doc, recibo);
    });
  }

  static renderSolicitudMonitor(
    doc: typeof PDFDocument,
    data: {
      nrosolicitud: string;
      cliente?: any;
      producto?: any;
      vendedor?: any;
      monto?: number;
      totalapagar?: number;
      cantidadcuotas?: number;
      cuotas_pagadas?: number;
      total_pagado?: number;
      observacion?: string;
      fechalta?: string;
    },
  ): void {
    doc.fontSize(16).text("Monitor de Solicitud", { align: "center" });
    doc.moveDown(0.6);

    doc.fontSize(12).text(`Solicitud N°: ${data.nrosolicitud}`);
    doc.text(`Cliente: ${data.cliente?.appynom || ""}`);
    doc.text(`DNI: ${data.cliente?.dni || ""}`);
    doc.text(`Teléfono: ${data.cliente?.telefono || ""}`);
    doc.text(`Dirección: ${data.cliente?.direccion || ""}`);
    doc.text(`Localidad: ${data.cliente?.localidad?.nombre || ""}`);
    doc.text(`Fecha alta: ${data.fechalta || ""}`);
    doc.text(`Producto: ${data.producto?.descripcion || ""}`);
    doc.text(`Vendedor: ${data.vendedor?.apellidonombre || ""}`);
    doc.moveDown(0.4);

    doc.text(`N° Cuotas: ${data.cantidadcuotas || 0}`);
    doc.text(`Imp. Cuota: $${data.monto || 0}`);
    doc.text(`Total a Pagar: $${data.totalapagar || 0}`);
    doc.text(`Pagadas: ${data.cuotas_pagadas || 0}`);
    doc.text(`Lleva Pagado: $${data.total_pagado || 0}`);
    doc.moveDown(0.6);

    doc.fontSize(12).text("Observaciones:", { underline: true });
    doc.fontSize(11).text(data.observacion || "-", {
      width: 500,
      align: "left",
    });
  }

  static async buildSolicitudesXlsx(
    rows: SolicitudReporteRow[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Solicitudes");

    sheet.columns = [
      { header: "Solicitud", key: "solicitud", width: 15 },
      { header: "Cliente", key: "cliente", width: 30 },
      { header: "Teléfono", key: "telefono", width: 18 },
      { header: "Producto", key: "producto", width: 30 },
      { header: "Cuota", key: "nrocuota", width: 10 },
      { header: "Importe", key: "importe", width: 12 },
      { header: "Vencimiento", key: "vencimiento", width: 14 },
    ];

    rows.forEach((row) => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  static async generarReporteMora() {
    // Implementación placeholder para resolver el error de build
    // En el futuro, esto debería obtener datos reales de la base de datos
    return {
      mensaje: "Reporte de mora generado",
      fecha: new Date().toISOString(),
      datos: [],
    };
  }

  static async renderReporteMora(doc: typeof PDFDocument) {
    // Implementación básica para renderizar el reporte en PDF
    doc.fontSize(20).text("Reporte de Mora", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    doc.text("Detalle de clientes en mora:");
    // Aquí iría la lógica real de renderizado
    doc.text("Sin datos disponibles.");
  }

  static async renderAnalisisCartera(doc: typeof PDFDocument) {
    // Implementación básica para renderizar el análisis en PDF
    doc.fontSize(20).text("Análisis de Cartera", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    doc.text("Resumen de cartera:");
    // Aquí iría la lógica real de renderizado
    doc.text("Sin datos disponibles.");
  }
}
