import { ClienteRepository } from "../repositories/clienteRepository";
import {
  CreateClienteDTO,
  UpdateClienteDTO,
  ClienteResponse,
} from "../types/cliente";

export class ClienteService {
  /**
   * Obtiene lista de clientes
   */
  static async listarClientes(
    q?: string,
    page?: number,
    pageSize?: number,
  ): Promise<ClienteResponse> {
    try {
      const result = await ClienteRepository.getAllClientes(q, page, pageSize);
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
   * Busca clientes por nombre
   */
  static async buscarClientes(query: string): Promise<ClienteResponse> {
    try {
      if (!query || query.trim().length === 0) {
        return {
          success: false,
          error: "Criterio de búsqueda vacío",
        };
      }

      const clientes = await ClienteRepository.searchClientes(query.trim());
      return {
        success: true,
        data: clientes,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtiene un cliente por ID
   */
  static async obtenerCliente(idcliente: number): Promise<ClienteResponse> {
    try {
      if (!Number.isInteger(idcliente) || idcliente <= 0) {
        return {
          success: false,
          error: "ID de cliente inválido",
        };
      }

      const cliente = await ClienteRepository.getClienteById(idcliente);
      if (!cliente) {
        return {
          success: false,
          error: "Cliente no encontrado",
        };
      }

      return {
        success: true,
        data: cliente,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Crea un nuevo cliente con validaciones
   */
  static async crearCliente(dto: CreateClienteDTO): Promise<ClienteResponse> {
    try {
      // Validaciones
      const validation = this.validateClienteData(dto);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Verificar DNI único
      const dniExists = await ClienteRepository.dniExists(dto.dni);
      if (dniExists) {
        return {
          success: false,
          error: "El DNI ya existe en la base de datos",
        };
      }

      const cliente = await ClienteRepository.createCliente(dto);
      return {
        success: true,
        data: cliente,
        message: "Cliente creado exitosamente",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Actualiza un cliente existente
   */
  static async actualizarCliente(
    dto: UpdateClienteDTO,
  ): Promise<ClienteResponse> {
    try {
      // Validaciones
      if (!Number.isInteger(dto.idcliente) || dto.idcliente <= 0) {
        return {
          success: false,
          error: "ID de cliente inválido",
        };
      }

      const validation = this.validateClienteData(dto);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Verificar que el cliente existe
      const clienteExistente = await ClienteRepository.getClienteById(
        dto.idcliente,
      );
      if (!clienteExistente) {
        return {
          success: false,
          error: "Cliente no encontrado",
        };
      }

      // Verificar DNI único (excluyendo el cliente actual)
      if (dto.dni !== clienteExistente.dni) {
        const dniExists = await ClienteRepository.dniExists(
          dto.dni,
          dto.idcliente,
        );
        if (dniExists) {
          return {
            success: false,
            error: "El DNI ya existe en la base de datos",
          };
        }
      }

      const cliente = await ClienteRepository.updateCliente(dto);
      return {
        success: true,
        data: cliente,
        message: "Cliente actualizado exitosamente",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Valida los datos del cliente
   */
  private static validateClienteData(data: any): {
    valid: boolean;
    error?: string;
  } {
    if (!data.appynom || data.appynom.trim().length === 0) {
      return { valid: false, error: "El nombre/apellido es requerido" };
    }

    if (!data.dni || data.dni.trim().length === 0) {
      return { valid: false, error: "El DNI es requerido" };
    }

    if (!data.direccion || data.direccion.trim().length === 0) {
      return { valid: false, error: "La dirección es requerida" };
    }

    if (!data.telefono || data.telefono.trim().length === 0) {
      return { valid: false, error: "El teléfono es requerido" };
    }

    if (
      !data.selectLocalidades ||
      !Number.isInteger(data.selectLocalidades) ||
      data.selectLocalidades <= 0
    ) {
      return { valid: false, error: "Localidad inválida" };
    }

    // Validación de formato DNI (simple)
    if (!/^\d{7,8}$/.test(data.dni.replace(/\D/g, ""))) {
      return { valid: false, error: "Formato de DNI inválido" };
    }

    return { valid: true };
  }
}
