import { LocalidadRepository } from "../repositories/localidadRepository";
import { LocalidadResponse } from "../types/localidad";

export class LocalidadService {
  /**
   * Obtiene lista de todas las localidades
   */
  static async listarLocalidades(): Promise<LocalidadResponse> {
    try {
      const localidades = await LocalidadRepository.getAllLocalidades();
      return {
        success: true,
        data: localidades,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Busca localidades por nombre
   */
  static async buscarLocalidades(query: string): Promise<LocalidadResponse> {
    try {
      if (!query || query.trim().length === 0) {
        return {
          success: false,
          error: "Criterio de búsqueda vacío",
        };
      }

      const localidades = await LocalidadRepository.searchLocalidades(
        query.trim(),
      );
      return {
        success: true,
        data: localidades,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtiene una localidad por ID
   */
  static async obtenerLocalidad(
    idlocalidad: number,
  ): Promise<LocalidadResponse> {
    try {
      if (!Number.isInteger(idlocalidad) || idlocalidad <= 0) {
        return {
          success: false,
          error: "ID de localidad inválido",
        };
      }

      const localidad = await LocalidadRepository.getLocalidadById(idlocalidad);
      if (!localidad) {
        return {
          success: false,
          error: "Localidad no encontrada",
        };
      }

      return {
        success: true,
        data: localidad,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
