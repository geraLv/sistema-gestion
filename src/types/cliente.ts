export interface Cliente {
  idcliente: number;
  appynom: string;
  dni: string;
  direccion: string;
  telefono: string;
  relalocalidad: number;
  condicion: number;
  fechalta?: string;
}

export interface ClienteWithLocalidad extends Cliente {
  nombre?: string; // nombre de localidad
}

export interface CreateClienteDTO {
  appynom: string;
  dni: string;
  direccion: string;
  telefono: string;
  selectLocalidades: number;
}

export interface UpdateClienteDTO {
  idcliente: number;
  appynom: string;
  dni: string;
  direccion: string;
  telefono: string;
  selectLocalidades: number;
}

export interface ClienteResponse {
  success: boolean;
  data?: Cliente | Cliente[] | null;
  message?: string;
  error?: string;
}
