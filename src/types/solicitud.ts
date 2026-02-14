export interface Solicitud {
  idsolicitud: number;
  relacliente: number;
  relaproducto: number;
  relavendedor: number;
  monto: number;
  cantidadcuotas: number;
  totalabonado: number;
  nrosolicitud: string;
  totalapagar: number;
  porcentajepagado: number;
  observacion?: string;
  estado: number; // 0=activa, 1=baja
  fechalta?: string;
}

export interface Cuota {
  idcuota: number;
  relasolicitud: number;
  nrocuota: number;
  importe: number;
  fecha?: string; // fecha de pago
  vencimiento: string;
  saldoanterior?: number;
  estado: number; // 0=impaga, 2=pagada
}

export interface SolicitudConDetalles extends Solicitud {
  cliente_appynom?: string;
  cliente_dni?: string;
  cliente_direccion?: string;
  cliente_telefono?: string;
  producto_descripcion?: string;
  vendedor_apellidonombre?: string;
  localidad_nombre?: string;
  cuotas_pagadas?: number;
  total_pagado?: number;
}

export interface CreateSolicitudDTO {
  selectCliente: number;
  idproducto: number;
  selectVendedor: number;
  monto: number;
  totalapagar: number;
  selectCuotas: number;
  nroSolicitud?: string;
  observacion?: string;
}

export interface UpdateSolicitudDTO {
  idsolicitud: number;
  selectCliente?: number;
  selectVendedor?: number;
  idproducto?: number;
  monto: number;
  selectCuotas: number;
  nroSolicitud: string;
  totalapagar: number;
  observacion?: string;
  selectEstado: number;
}

export interface SolicitudResponse {
  success: boolean;
  data?:
    | Solicitud
    | Solicitud[]
    | SolicitudConDetalles
    | SolicitudConDetalles[]
    | null;
  total?: number;
  message?: string;
  error?: string;
}

export interface CuotaResponse {
  success: boolean;
  data?: Cuota | Cuota[] | null;
  message?: string;
  error?: string;
}
