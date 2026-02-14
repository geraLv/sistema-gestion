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

  static renderRecibo(doc: typeof PDFDocument, data: ReciboCuotaData): void {
    doc.fontSize(18).text("Recibo de Cobranza", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Solicitud N°: ${data.nrosolicitud}`);
    doc.text(`Cuota N°: ${data.nrocuota}`);
    doc.text(`Importe: $${data.importe}`);
    doc.text(`Vencimiento: ${data.vencimiento}`);
    doc.moveDown(0.5);

    doc.fontSize(12).text("Cliente", { underline: true });
    doc.text(`Apellido y Nombre: ${data.cliente.appynom}`);
    doc.text(`DNI: ${data.cliente.dni}`);
    doc.text(`Dirección: ${data.cliente.direccion}`);
    doc.text(`Teléfono: ${data.cliente.telefono}`);
    doc.text(`Localidad: ${data.cliente.localidad}`);
    doc.moveDown(0.5);

    doc.fontSize(12).text("Producto", { underline: true });
    doc.text(`${data.producto.descripcion}`);
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
}
