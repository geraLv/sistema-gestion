export interface User {
  iduser?: number;
  usuario: string;
  password: string;
  nombre?: string;
  email?: string;
  estado?: number;
  status?: number;
  role?: string;
  fechacreacion?: string;
}

export interface UserPublic {
  iduser: number;
  usuario: string;
  nombre?: string;
  email?: string;
  estado?: number;
  status?: number;
  role?: string;
  fechacreacion?: string;
}

export interface UserPayload {
  iduser: number;
  usuario: string;
  nombre?: string;
  role?: string;
  status?: number;
}

export interface LoginDTO {
  usuario: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: UserPayload;
  userData?: UserPayload;
  message?: string;
  error?: string;
}

export interface ValidateTokenResponse {
  success: boolean;
  valid: boolean;
  user?: UserPayload;
  error?: string;
}

export interface ChangePasswordDTO {
  usuario: string;
  passwordActual: string;
  passwordNueva: string;
}
