import { supabase } from "../db";
import { Cuota, CuotaWithSolicitud } from "../types/cuota";

export class CuotaRepository {
  /**
   * Obtiene una cuota por ID
   */
  static async getCuotaById(idcuota: number): Promise<Cuota | null> {
    const { data, error } = await supabase
      .from("cuotas")
      .select("*")
      .eq("idcuota", idcuota)
      .single();

    if (error) {
      console.error("Error fetching cuota:", error.message);
      return null;
    }

    return data as Cuota;
  }

  /**
   * Obtiene cuotas con información de solicitud y cliente
   */
  static async getCuotasWithDetails(
    filtro?: "pagadas" | "impagas" | "vencidas",
  ): Promise<CuotaWithSolicitud[]> {
    let query = supabase
      .from("cuotas")
      .select(
        `
        idcuota, relasolicitud, nrocuota, importe, vencimiento, estado, fecha,
        solicitud:relasolicitud(nrosolicitud, idsolicitud),
        cliente:relasolicitud(*)
      `,
      )
      .order("vencimiento", { ascending: true });

    if (filtro === "pagadas") {
      query = query.eq("estado", 2);
    } else if (filtro === "impagas") {
      query = query.eq("estado", 0);
    } else if (filtro === "vencidas") {
      const hoy = new Date().toISOString().split("T")[0];
      query = query.eq("estado", 0).lt("vencimiento", hoy);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching cuotas:", error.message);
      throw new Error(`Error al obtener cuotas: ${error.message}`);
    }

    return data as CuotaWithSolicitud[];
  }

  /**
   * Pagar una cuota (actualizar estado a 2 y agregar fecha)
   */
  static async pagarCuota(idcuota: number): Promise<Cuota> {
    const hoy = new Date().toISOString().split("T")[0];

    // Obtener cuota actual
    const cuotaActual = await this.getCuotaById(idcuota);
    if (!cuotaActual) {
      throw new Error("Cuota no encontrada");
    }

    // Actualizar cuota
    const { data: cuotaActualizada, error: errorCuota } = await supabase
      .from("cuotas")
      .update({
        estado: 2,
        fecha: hoy,
        saldoanterior: cuotaActual.importe,
      })
      .eq("idcuota", idcuota)
      .select()
      .single();

    if (errorCuota) {
      throw new Error(`Error al actualizar cuota: ${errorCuota.message}`);
    }

    return cuotaActualizada as Cuota;
  }

  /**
   * Obtiene importe de la cuota y datos de la solicitud para recalcular
   */
  static async getCuotaAndSolicitudData(idcuota: number): Promise<{
    importe: number;
    idsolicitud: number;
    totalabonado: number;
    totalapagar: number;
  }> {
    const { data, error } = await supabase
      .from("cuotas")
      .select(
        `
        importe,
        solicitud:relasolicitud(idsolicitud, totalabonado, totalapagar)
      `,
      )
      .eq("idcuota", idcuota)
      .single();

    if (error) {
      throw new Error(`Error al obtener datos: ${error.message}`);
    }

    const cuota = data as any;
    return {
      importe: cuota.importe,
      idsolicitud: cuota.solicitud[0].idsolicitud,
      totalabonado: cuota.solicitud[0].totalabonado,
      totalapagar: cuota.solicitud[0].totalapagar,
    };
  }

  /**
   * Actualiza el importe de una cuota
   */
  static async modificarImporteCuota(
    idcuota: number,
    nuevoImporte: number,
  ): Promise<Cuota> {
    // Obtener cuota
    const cuotaActual = await this.getCuotaById(idcuota);
    if (!cuotaActual) {
      throw new Error("Cuota no encontrada");
    }

    // Si la cuota está pagada, no permitir cambio
    if (cuotaActual.estado === 2) {
      throw new Error("No se puede modificar el importe de una cuota pagada");
    }

    // Actualizar cuota
    const { data, error } = await supabase
      .from("cuotas")
      .update({ importe: nuevoImporte })
      .eq("idcuota", idcuota)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al actualizar importe: ${error.message}`);
    }

    return data as Cuota;
  }

  /**
   * Actualiza porcentaje pagado en la solicitud
   */
  static async actualizarPorcentajeSolicitud(
    idsolicitud: number,
  ): Promise<void> {
    // Obtener datos de solicitud y cuotas
    const { data: solicitud, error: errorSol } = await supabase
      .from("solicitud")
      .select("totalapagar")
      .eq("idsolicitud", idsolicitud)
      .single();

    if (errorSol) {
      throw new Error(`Error al obtener solicitud: ${errorSol.message}`);
    }

    // Sumar importe de cuotas pagadas
    const { data: cuotasPagadas, error: errorCuotas } = await supabase
      .from("cuotas")
      .select("importe")
      .eq("relasolicitud", idsolicitud)
      .eq("estado", 2);

    if (errorCuotas) {
      throw new Error(`Error al obtener cuotas: ${errorCuotas.message}`);
    }

    const totalabonado = (cuotasPagadas as any[]).reduce(
      (sum, c) => sum + c.importe,
      0,
    );
    const porcentajepagado =
      (totalabonado * 100) / (solicitud as any).totalapagar;

    // Actualizar solicitud
    const { error: errorUpdate } = await supabase
      .from("solicitud")
      .update({
        totalabonado,
        porcentajepagado: Math.round(porcentajepagado * 100) / 100,
      })
      .eq("idsolicitud", idsolicitud);

    if (errorUpdate) {
      throw new Error(`Error al actualizar solicitud: ${errorUpdate.message}`);
    }
  }

  /**
   * Obtiene todas las cuotas de una solicitud
   */
  static async getCuotasBySolicitud(idsolicitud: number): Promise<Cuota[]> {
    const { data, error } = await supabase
      .from("cuotas")
      .select("*")
      .eq("relasolicitud", idsolicitud)
      .order("nrocuota", { ascending: true });

    if (error) {
      throw new Error(`Error al obtener cuotas: ${error.message}`);
    }

    return data as Cuota[];
  }

  /**
   * Obtiene resumen de cuotas (pagadas, impagas, etc)
   */
  static async getCuotasResumen(idsolicitud: number): Promise<{
    total: number;
    pagadas: number;
    impagas: number;
    montoTotal: number;
    montoPagado: number;
    montoImpago: number;
  }> {
    const { data, error } = await supabase
      .from("cuotas")
      .select("*")
      .eq("relasolicitud", idsolicitud);

    if (error) {
      throw new Error(`Error al obtener cuotas: ${error.message}`);
    }

    const cuotas = data as Cuota[];
    const pagadas = cuotas.filter((c) => c.estado === 2).length;
    const impagas = cuotas.filter((c) => c.estado === 0).length;
    const montoTotal = cuotas.reduce((sum, c) => sum + c.importe, 0);
    const montoPagado = cuotas
      .filter((c) => c.estado === 2)
      .reduce((sum, c) => sum + c.importe, 0);
    const montoImpago = montoTotal - montoPagado;

    return {
      total: cuotas.length,
      pagadas,
      impagas,
      montoTotal,
      montoPagado,
      montoImpago,
    };
  }
}
