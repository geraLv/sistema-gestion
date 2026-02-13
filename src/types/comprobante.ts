export interface CuotaComprobante {
  idcomprobante: number;
  idcuota: number;
  archivo_path: string;
  archivo_url: string;
  archivo_nombre?: string | null;
  archivo_tipo?: string | null;
  archivo_size?: number | null;
  created_at?: string;
  created_by?: number | null;
  observacion?: string | null;
}

export interface CreateCuotaComprobanteDTO {
  idcuota: number;
  archivo_path: string;
  archivo_url: string;
  archivo_nombre?: string | null;
  archivo_tipo?: string | null;
  archivo_size?: number | null;
  created_by?: number | null;
  observacion?: string | null;
}
