/**
 * Tipos e interfaces para Productos
 */

export interface Producto {
  relaproducto: number;
  descripcion: string;
  precio: number;
  estado?: number; // 1=activo, 0=inactivo
  createdAt?: string;
}

export interface ProductoWithStats extends Producto {
  totalSolicitudes?: number;
}
