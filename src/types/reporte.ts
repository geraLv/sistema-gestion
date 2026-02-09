export interface ReciboCuotaData {
  idcuota: number;
  nrocuota: number;
  importe: number;
  vencimiento: string;
  nrosolicitud: string;
  cliente: {
    appynom: string;
    dni: string;
    direccion: string;
    telefono: string;
    localidad: string;
  };
  producto: {
    descripcion: string;
  };
}

export interface SolicitudReporteRow {
  solicitud: string;
  cliente: string;
  telefono: string;
  producto: string;
  nrocuota: number;
  importe: number;
  vencimiento: string;
}
