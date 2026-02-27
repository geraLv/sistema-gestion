export interface Solicitud {
  idsolicitud: number;
  relacliente: number;
  relaproducto: number;
  relavendedor: number;
  relausuario?: number; // FK a app_user
  monto: number;
  cantidadcuotas: number;
  totalabonado: number;
  nrosolicitud: string;
  totalapagar: number;
  porcentajepagado: number;
  observacion?: string;
  estado: number; // 0=baja/anulada, 1=activa/pendiente, 2=pagada
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
  usuario_nombre?: string;
  localidad_nombre?: string;
  cuotas_pagadas?: number;
  total_pagado?: number;
}

export interface CreateSolicitudDTO {
  selectCliente: number;
  idproducto: number;
  selectVendedor: number;
  relausuario?: number; // iduser del usuario autenticado
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
  relausuario?: number;
  monto: number;
  selectCuotas: number;
  nroSolicitud: string;
  totalapagar: number;
  observacion?: string;
  selectEstado: number;
}

export interface MisVentasKPIs {
  totalImporte: number;
  activas: number;
  pagadas: number;
  bajas: number;
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
  kpis?: MisVentasKPIs;
  message?: string;
  error?: string;
}

export interface CuotaResponse {
  success: boolean;
  data?: Cuota | Cuota[] | null;
  message?: string;
  error?: string;
}
