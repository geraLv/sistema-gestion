export interface Contrato {
    idcontrato: string;
    relasolicitud: number;
    token_acceso: string;
    estado: number; // 1: Pendiente, 2: Firmado
    url_pdf_original: string | null;
    url_pdf_firmado: string | null;
    fecha_generacion: string;
    fecha_firma: string | null;
    ip_cliente_firma: string | null;
}

export interface CreateContratoDTO {
    relasolicitud: number;
    url_pdf_original: string;
    token_acceso: string;
}
