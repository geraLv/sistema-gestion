import { SolicitudRepository } from "../repositories/solicitudRepository";
import {
  CreateSolicitudDTO,
  UpdateSolicitudDTO,
  SolicitudResponse,
  CuotaResponse,
} from "../types/solicitud";

export class SolicitudService {
  /**
   * Obtiene lista de todas las solicitudes
   */
  static async listarSolicitudes(
    q?: string,
    page?: number,
    pageSize?: number,
    filtro?: "pagadas" | "impagas" | "pendientes",
  ): Promise<SolicitudResponse> {
    try {
      const result = await SolicitudRepository.getAllSolicitudes(
        q,
        page,
        pageSize,
        filtro,
      );
      return {
        success: true,
        data: result.data,
        total: result.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtiene una solicitud por ID
   */
  static async obtenerSolicitud(
    idsolicitud: number,
  ): Promise<SolicitudResponse> {
    try {
      if (!Number.isInteger(idsolicitud) || idsolicitud <= 0) {
        return {
          success: false,
          error: "ID de solicitud inválido",
        };
      }

      const solicitud = await SolicitudRepository.getSolicitudById(idsolicitud);
      if (!solicitud) {
        return {
          success: false,
          error: "Solicitud no encontrada",
        };
      }

      return {
        success: true,
        data: solicitud,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtiene una solicitud por nrosolicitud con cuotas
   */
  static async obtenerSolicitudPorNro(nrosolicitud: string): Promise<any> {
    try {
      if (!nrosolicitud || nrosolicitud.trim().length === 0) {
        return {
          success: false,
          error: "Número de solicitud requerido",
        };
      }

      const solicitud = await SolicitudRepository.getSolicitudByNro(
        nrosolicitud.trim(),
      );
      if (!solicitud) {
        return {
          success: false,
          error: "Solicitud no encontrada",
        };
      }

      // Obtener cuotas
      const cuotas = await SolicitudRepository.getCuotasBySolicitud(
        solicitud.idsolicitud,
      );

      // Contar cuotas pagadas
      const cuotasPagadas = cuotas.filter((c) => c.estado === 2).length;
      const totalPagado = cuotas
        .filter((c) => c.estado === 2)
        .reduce((sum, c) => sum + c.importe, 0);

      return {
        success: true,
        data: {
          ...solicitud,
          cuotas,
          cuotas_pagadas: cuotasPagadas,
          total_pagado: totalPagado,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Crea una nueva solicitud con cuotas automáticas
   */
  static async crearSolicitud(
    dto: CreateSolicitudDTO,
  ): Promise<SolicitudResponse> {
    try {
      // Validaciones
      const validation = this.validateSolicitudCreate(dto);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Verificar que nrosolicitud sea único
      if (dto.nroSolicitud && dto.nroSolicitud.trim().length > 0) {
        const existe = await SolicitudRepository.nrosolicitudExists(
          dto.nroSolicitud,
        );
        if (existe) {
          return {
            success: false,
            error: "Ya existe una solicitud con ese número",
          };
        }
      }

      // Crear solicitud
      const solicitud = await SolicitudRepository.createSolicitud(dto);

      // Crear cuotas automáticamente
      try {
        await SolicitudRepository.createCuotas(
          solicitud.idsolicitud,
          dto.selectCuotas,
          dto.monto,
        );
      } catch (error: any) {
        // Si falla crear cuotas, intentar limpiar la solicitud
        console.error("Error creating cuotas:", error.message);
        throw new Error(
          `Solicitud creada pero falló al generar cuotas: ${error.message}`,
        );
      }

      return {
        success: true,
        data: solicitud,
        message: `Solicitud creada con ${dto.selectCuotas} cuotas`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Actualiza una solicitud existente
   */
  static async actualizarSolicitud(
    dto: UpdateSolicitudDTO,
  ): Promise<SolicitudResponse> {
    try {
      // Validaciones
      if (!Number.isInteger(dto.idsolicitud) || dto.idsolicitud <= 0) {
        return {
          success: false,
          error: "ID de solicitud inválido",
        };
      }

      const validation = this.validateSolicitudUpdate(dto);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Verificar que la solicitud existe
      const solicitudExistente = await SolicitudRepository.getSolicitudById(
        dto.idsolicitud,
      );
      if (!solicitudExistente) {
        return {
          success: false,
          error: "Solicitud no encontrada",
        };
      }

      // Si cambió el monto, actualizar cuotas impagas
      if (dto.monto !== solicitudExistente.monto) {
        await SolicitudRepository.updateCuotasImpagas(
          dto.idsolicitud,
          dto.monto,
        );
      }

      // Actualizar solicitud
      const solicitud = await SolicitudRepository.updateSolicitud(dto);

      return {
        success: true,
        data: solicitud,
        message: "Solicitud actualizada correctamente",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Agrega cuotas adicionales a una solicitud
   */
  static async adicionarCuotas(
    idsolicitud: number,
    cantidadNueva: number,
  ): Promise<SolicitudResponse> {
    try {
      if (!Number.isInteger(idsolicitud) || idsolicitud <= 0) {
        return {
          success: false,
          error: "ID de solicitud inválido",
        };
      }

      if (!Number.isInteger(cantidadNueva) || cantidadNueva <= 0) {
        return {
          success: false,
          error: "Cantidad de cuotas debe ser un número positivo",
        };
      }

      // Verificar que la solicitud existe
      const solicitud = await SolicitudRepository.getSolicitudById(idsolicitud);
      if (!solicitud) {
        return {
          success: false,
          error: "Solicitud no encontrada",
        };
      }

      // Agregar cuotas
      await SolicitudRepository.adicionarCuotas(idsolicitud, cantidadNueva);

      return {
        success: true,
        message: `Se agregaron ${cantidadNueva} cuotas a la solicitud`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Actualiza las observaciones de una solicitud
   */
  static async actualizarObservaciones(
    nrosolicitud: string,
    observacion: string,
  ): Promise<SolicitudResponse> {
    try {
      if (!nrosolicitud || nrosolicitud.trim().length === 0) {
        return {
          success: false,
          error: "Número de solicitud requerido",
        };
      }

      await SolicitudRepository.updateObservaciones(nrosolicitud, observacion);

      return {
        success: true,
        message: "Observaciones actualizadas",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtiene cuotas de una solicitud
   */
  static async obtenerCuotas(idsolicitud: number): Promise<CuotaResponse> {
    try {
      if (!Number.isInteger(idsolicitud) || idsolicitud <= 0) {
        return {
          success: false,
          error: "ID de solicitud inválido",
        };
      }

      const cuotas =
        await SolicitudRepository.getCuotasBySolicitud(idsolicitud);

      return {
        success: true,
        data: cuotas,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Valida los datos de la solicitud
   */
  private static validateSolicitudCreate(data: any): {
    valid: boolean;
    error?: string;
  } {
    if (!data.selectCliente || data.selectCliente <= 0) {
      return { valid: false, error: "Cliente inválido" };
    }

    if (!data.idproducto || data.idproducto <= 0) {
      return { valid: false, error: "Producto inválido" };
    }

    if (!data.selectVendedor || data.selectVendedor <= 0) {
      return { valid: false, error: "Vendedor inválido" };
    }

    if (!data.monto || data.monto <= 0) {
      return { valid: false, error: "Monto debe ser mayor a 0" };
    }

    if (!data.totalapagar || data.totalapagar <= 0) {
      return { valid: false, error: "Total a pagar debe ser mayor a 0" };
    }

    if (!data.selectCuotas || data.selectCuotas <= 0) {
      return { valid: false, error: "Cantidad de cuotas debe ser mayor a 0" };
    }

    return { valid: true };
  }

  private static validateSolicitudUpdate(data: any): {
    valid: boolean;
    error?: string;
  } {
    if (data.selectCliente !== undefined && data.selectCliente <= 0) {
      return { valid: false, error: "Cliente inválido" };
    }

    if (data.selectVendedor !== undefined && data.selectVendedor <= 0) {
      return { valid: false, error: "Vendedor inválido" };
    }

    if (data.idproducto !== undefined && data.idproducto <= 0) {
      return { valid: false, error: "Producto inválido" };
    }

    if (!data.monto || data.monto <= 0) {
      return { valid: false, error: "Monto debe ser mayor a 0" };
    }

    if (!data.totalapagar || data.totalapagar <= 0) {
      return { valid: false, error: "Total a pagar debe ser mayor a 0" };
    }

    if (!data.selectCuotas || data.selectCuotas <= 0) {
      return { valid: false, error: "Cantidad de cuotas debe ser mayor a 0" };
    }

    if (!data.nroSolicitud || data.nroSolicitud.trim().length === 0) {
      return { valid: false, error: "Número de solicitud es requerido" };
    }

    return { valid: true };
  }
}
