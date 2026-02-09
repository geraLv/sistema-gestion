import { VendedorRepository } from "../repositories/vendedorRepository";
import { ProductoRepository } from "../repositories/productoRepository";

export class VendedorService {
  static async getAllVendedores() {
    return VendedorRepository.getAllVendedores();
  }

  static async getVendedorById(idvendedor: number) {
    return VendedorRepository.getVendedorById(idvendedor);
  }

  static async getVendedoresActivos() {
    return VendedorRepository.getVendedoresActivos();
  }

  static async buscarVendedores(query: string) {
    if (!query || query.trim().length === 0) {
      return this.getAllVendedores();
    }
    return VendedorRepository.buscarVendedores(query);
  }

  static async createVendedor(apellidonombre: string, estado: number = 1) {
    return VendedorRepository.createVendedor(apellidonombre, estado);
  }

  static async updateVendedor(idvendedor: number, apellidonombre: string) {
    return VendedorRepository.updateVendedor(idvendedor, apellidonombre);
  }

  static async setVendedorStatus(idvendedor: number, estado: number) {
    return VendedorRepository.setVendedorStatus(idvendedor, estado);
  }
}

export class ProductoService {
  static async getAllProductos() {
    return ProductoRepository.getAllProductos();
  }

  static async getProductoById(relaproducto: number) {
    return ProductoRepository.getProductoById(relaproducto);
  }

  static async getProductosActivos() {
    return ProductoRepository.getProductosActivos();
  }

  static async buscarProductos(query: string) {
    if (!query || query.trim().length === 0) {
      return this.getAllProductos();
    }
    return ProductoRepository.buscarProductos(query);
  }
}
