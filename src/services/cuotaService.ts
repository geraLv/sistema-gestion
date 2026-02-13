import { CuotaRepository } from "../repositories/cuotaRepository";
import { AdelantoRepository } from "../repositories/adelantoRepository";
import { SolicitudRepository } from "../repositories/solicitudRepository";
import { Cuota } from "../types/cuota";
import { Adelanto } from "../types/adelanto";
import {
  PagarCuotaDTO,
  PagarMultiplesCuotasDTO,
  ModificarImporteCuotaDTO,
  PagarCuotaResponse,
} from "../types/cuota";
import { CargarAdelantoDTO } from "../types/adelanto";

export class CuotaService {
  /**
   * Pagar una cuota y actualizar solicitud
   */
  static async pagarCuota(dto: PagarCuotaDTO): Promise<PagarCuotaResponse> {
    // Validar que la cuota existe
    const cuota = await CuotaRepository.getCuotaById(dto.idcuota);
    if (!cuota) {
      throw new Error("Cuota no encontrada");
    }
    // Si ya está pagada, error
    if (cuota.estado === 2) {
      throw new Error("Esta cuota ya está pagada");
    }

    // Pagar cuota
    const cuotaPagada = await CuotaRepository.pagarCuota(dto.idcuota);

    console.log(cuota.relasolicitud);
    // Actualizar solicitud con nuevos valores
    const actualizado = await CuotaRepository.actualizarPorcentajeSolicitud(
      cuota.relasolicitud,
    );
    console.log("paso2");
    return {
      success: true,
      cuotaPagada,
      solicitudActualizada: {
        totalabonado: actualizado.totalabonado,
        porcentajepagado: actualizado.porcentajepagado,
      },
    };
  }

  /**
   * Pagar múltiples cuotas
   */
  static async pagarMultiplesCuotas(
    dto: PagarMultiplesCuotasDTO,
  ): Promise<any> {
    const resultados: any[] = [];
    const solicitudes = new Set<number>();

    for (const idcuota of dto.idcuotas) {
      try {
        const resultado = await this.pagarCuota({ idcuota });
        resultados.push(resultado);
        solicitudes.add(resultado.solicitudActualizada.totalabonado as any);
      } catch (error) {
        resultados.push({
          idcuota,
          error: (error as Error).message,
        });
      }
    }

    return {
      totalProcesadas: dto.idcuotas.length,
      exitosas: resultados.filter((r: any) => !r.error).length,
      fallidas: resultados.filter((r: any) => r.error).length,
      resultados,
    };
  }

  /**
   * Modificar importe de una cuota
   */
  static async modificarImporte(dto: ModificarImporteCuotaDTO): Promise<Cuota> {
    // Validar importe
    if (dto.importe <= 0) {
      throw new Error("El importe debe ser mayor a 0");
    }
    // Modificar cuota
    const cuota = await CuotaRepository.modificarImporteCuota(
      dto.idcuota,
      dto.importe,
    );

    // Obtener idsolicitud para recalcular
    const cuotaData = await CuotaRepository.getCuotaById(dto.idcuota);
    if (cuotaData) {
      await CuotaRepository.actualizarPorcentajeSolicitud(
        cuotaData.relasolicitud,
      );
    }

    return cuota;
  }

  /**
   * Obtener cuotas con filtro
   */
  static async obtenerCuotas(filtro?: "pagadas" | "impagas" | "vencidas") {
    return CuotaRepository.getCuotasWithDetails(filtro);
  }

  /**
   * Obtener cuotas de una solicitud con resumen
   */
  static async obtenerCuotasSolicitud(idsolicitud: number) {
    const cuotas = await CuotaRepository.getCuotasBySolicitud(idsolicitud);
    const resumen = await CuotaRepository.getCuotasResumen(idsolicitud);

    return {
      cuotas,
      resumen,
    };
  }
}

export class AdelantoService {
  /**
   * Registrar un nuevo adelanto
   */
  static async cargarAdelanto(dto: CargarAdelantoDTO): Promise<Adelanto> {
    // Validar que la solicitud existe
    const solicitud = await SolicitudRepository.getSolicitudById(
      dto.idsolicitud,
    );
    if (!solicitud) {
      throw new Error("Solicitud no encontrada");
    }

    // Validar importe
    if (dto.adelantoimporte <= 0) {
      throw new Error("El adelanto debe ser mayor a 0");
    }

    // Crear adelanto
    return AdelantoRepository.crearAdelanto(
      dto.idsolicitud,
      dto.adelantoimporte,
    );
  }

  /**
   * Consultar total de adelantos de una solicitud
   */
  static async consultarAdelanto(idsolicitud: number): Promise<{
    totalAdelanto: number;
    adelantos: Adelanto[];
  }> {
    const adelantos =
      await AdelantoRepository.getAdelantosBySolicitud(idsolicitud);
    const totalAdelanto =
      await AdelantoRepository.getTotalAdelantosBySolicitud(idsolicitud);

    return {
      totalAdelanto,
      adelantos,
    };
  }

  /**
   * Obtener adelantos con detalles
   */
  static async obtenerAdelantosDetallados() {
    return AdelantoRepository.getAdelantosWithDetails();
  }
}
