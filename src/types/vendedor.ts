/**
 * Tipos e interfaces para Vendedores
 */

export interface Vendedor {
  idvendedor: number;
  apellidonombre: string;
  estado?: number; // 1=activo, 0=inactivo
  createdAt?: string;
}

export interface VendedorWithStats extends Vendedor {
  totalSolicitudes?: number;
  totalRecaudado?: number;
}
