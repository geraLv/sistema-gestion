export interface Cliente {
  idcliente: number;
  appynom: string;
  dni: string;
  direccion: string;
  telefono: string;
  email?: string;
  relalocalidad: number;
  condicion: number;
  fechalta?: string;
  fecha_nacimiento?: string;
}

export interface ClienteWithLocalidad extends Cliente {
  nombre?: string; // nombre de localidad
}

export interface CreateClienteDTO {
  appynom: string;
  dni: string;
  direccion: string;
  telefono: string;
  email?: string;
  selectLocalidades: number;
  fecha_nacimiento?: string;
}

export interface UpdateClienteDTO {
  idcliente: number;
  appynom: string;
  dni: string;
  direccion: string;
  telefono: string;
  email?: string;
  selectLocalidades: number;
  fecha_nacimiento?: string;
}

export interface ClienteResponse {
  success: boolean;
  data?: Cliente | Cliente[] | null;
  total?: number;
  message?: string;
  error?: string;
}
