export interface Localidad {
  idlocalidad: number;
  nombre: string;
  provincia?: string;
}

export interface LocalidadResponse {
  success: boolean;
  data?: Localidad | Localidad[] | null;
  message?: string;
  error?: string;
}
