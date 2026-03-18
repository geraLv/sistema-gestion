/**
 * Tipos e interfaces para Cuotas
 */

export interface Cuota {
  idcuota: number;
  relasolicitud: number;
  nrocuota: number;
  importe: number;
  vencimiento: string; // YYYY-MM-DD
  estado: 0 | 2; // 0=impaga, 2=pagada
  fecha?: string | null; // fecha de pago
  saldoanterior?: number;
  idusuariocobro?: number | null;
  createdAt?: string;
}

export interface CuotaWithSolicitud extends Cuota {
  nrosolicitud?: string;
  clienteNombre?: string;
  productoNombre?: string;
  cobradoPor?: string;
}

export interface PagarCuotaDTO {
  idcuota: number;
  formapago?: string;
  idusuariocobro?: number;
}

export interface PagarMultiplesCuotasDTO {
  idcuotas: number[];
  formapago?: string;
  idusuariocobro?: number;
}

export interface ModificarImporteCuotaDTO {
  idcuota: number;
  importe: number;
}

export interface CuotasPorEstadoResponse {
  totalCuotas: number;
  cuotasPagadas: number;
  cuotasImpagas: number;
  cuotas: CuotaWithSolicitud[];
}

export interface PagarCuotaResponse {
  success: boolean;
  cuotaPagada: Cuota;
  solicitudActualizada: {
    totalabonado: number;
    porcentajepagado: number;
  };
}
