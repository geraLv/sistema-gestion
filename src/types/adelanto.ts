/**
 * Tipos e interfaces para Adelantos
 */

export interface Adelanto {
  idadelanto: number;
  relasolicitud: number;
  adelantoimporte: number;
  adelantofecha: string; // YYYY-MM-DD
  createdAt?: string;
}

export interface AdelantoWithSolicitud extends Adelanto {
  nrosolicitud?: string;
  clienteNombre?: string;
  totalAdelanto?: number; // suma de todos los adelantos
}

export interface CargarAdelantoDTO {
  idsolicitud: number;
  adelantoimporte: number;
}

export interface ConsultarAdelantoResponse {
  totalAdelanto: number;
  adelantos: Adelanto[];
}
