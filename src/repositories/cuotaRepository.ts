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
    filtro?: "pagadas" | "impagas" | "vencidas" | "pendientes",
    q?: string,
    page?: number,
    pageSize?: number,
  ): Promise<{ data: CuotaWithSolicitud[]; total: number }> {
    let query = supabase
      .from("cuotas")
      .select(
        `
        idcuota, relasolicitud, nrocuota, importe, vencimiento, estado, fecha,
        solicitud:relasolicitud(
          nrosolicitud,
          idsolicitud,
          cliente:relacliente(appynom, dni)
        )
      `,
        { count: "exact" },
      )
      .order("vencimiento", { ascending: true });

    if (filtro === "pagadas") {
      query = query.eq("estado", 2);
    } else if (filtro === "impagas") {
      query = query.eq("estado", 0);
    } else if (filtro === "vencidas") {
      const hoy = new Date().toISOString().split("T")[0];
      query = query.eq("estado", 0).lt("vencimiento", hoy);
    } else if (filtro === "pendientes") {
      query = query.not("estado", "in", "(0,2)");
    }

    const queryTerm = q?.trim();
    if (queryTerm) {
      const ids = await this.searchSolicitudIds(queryTerm);
      if (ids.length === 0) {
        return { data: [], total: 0 };
      }
      query = query.in("relasolicitud", ids);
    }

    const size = pageSize && pageSize > 0 ? pageSize : undefined;
    const currentPage = page && page > 0 ? page : 1;
    if (size) {
      const from = (currentPage - 1) * size;
      const to = from + size - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching cuotas:", error.message);
      throw new Error(`Error al obtener cuotas: ${error.message}`);
    }

    return { data: (data as CuotaWithSolicitud[]) || [], total: count || 0 };
  }

  private static async searchSolicitudIds(query: string): Promise<number[]> {
    const q = query.trim();
    if (!q) return [];

    const ids = new Set<number>();
    const numeric = Number(q);
    if (Number.isFinite(numeric)) {
      const { data: nroData, error: nroError } = await supabase
        .from("solicitud")
        .select("idsolicitud")
        .eq("nrosolicitud", numeric)
        .limit(200);

      if (nroError) {
        throw new Error(`Error buscando solicitudes: ${nroError.message}`);
      }

      (nroData || []).forEach((row: any) => {
        if (Number.isFinite(row.idsolicitud)) ids.add(row.idsolicitud);
      });
    } else {
      const { data: nroData, error: nroError } = await supabase
        .from("solicitud")
        .select("idsolicitud")
        .ilike("nrosolicitud", `%${q}%`)
        .limit(200);

      if (nroError) {
        if (nroError.code !== "42883") {
          throw new Error(`Error buscando solicitudes: ${nroError.message}`);
        }
      } else {
        (nroData || []).forEach((row: any) => {
          if (Number.isFinite(row.idsolicitud)) ids.add(row.idsolicitud);
        });
      }
    }

    const clienteIds = new Set<number>();
    const { data: clientesPorNombre, error: clientesNombreError } =
      await supabase
        .from("cliente")
        .select("idcliente")
        .ilike("appynom", `%${q}%`)
        .limit(200);

    if (clientesNombreError) {
      throw new Error(
        `Error buscando clientes por nombre: ${clientesNombreError.message}`,
      );
    }

    (clientesPorNombre || []).forEach((row: any) => {
      if (Number.isFinite(row.idcliente)) clienteIds.add(row.idcliente);
    });

    if (Number.isFinite(numeric)) {
      const { data: clientesPorDni, error: clientesDniError } = await supabase
        .from("cliente")
        .select("idcliente")
        .eq("dni", q)
        .limit(200);

      if (clientesDniError) {
        throw new Error(
          `Error buscando clientes por DNI: ${clientesDniError.message}`,
        );
      }

      (clientesPorDni || []).forEach((row: any) => {
        if (Number.isFinite(row.idcliente)) clienteIds.add(row.idcliente);
      });
    }

    if (clienteIds.size > 0) {
      const { data: solPorCliente, error: solError } = await supabase
        .from("solicitud")
        .select("idsolicitud")
        .in("relacliente", Array.from(clienteIds))
        .limit(500);

      if (solError) {
        throw new Error(`Error buscando solicitudes: ${solError.message}`);
      }

      (solPorCliente || []).forEach((row: any) => {
        if (Number.isFinite(row.idsolicitud)) ids.add(row.idsolicitud);
      });
    }

    return Array.from(ids);
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
      idsolicitud: cuota.solicitud.idsolicitud,
      totalabonado: cuota.solicitud.totalabonado,
      totalapagar: cuota.solicitud.totalapagar,
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
  ): Promise<{ totalabonado: number; porcentajepagado: number }> {
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

    console.log("cuotas pagadas: ", cuotasPagadas);
    if (errorCuotas) {
      throw new Error(`Error al obtener cuotas: ${errorCuotas.message}`);
    }

    const totalabonado = (cuotasPagadas as any[]).reduce(
      (sum, c) => sum + c.importe,
      0,
    );
    const porcentajepagado =
      (totalabonado * 100) / (solicitud as any).totalapagar;

    console.log("totalabonado:", totalabonado);
    console.log("porcentajepagado:", porcentajepagado);

    // Actualizar solicitud
    const { error: errorUpdate } = await supabase
      .from("solicitud")
      .update({
        totalabonado: totalabonado,
        porcentajepagado: Math.round(porcentajepagado * 100) / 100,
      })
      .eq("idsolicitud", idsolicitud);

    console.log(errorUpdate);
    if (errorUpdate) {
      throw new Error(`Error al actualizar solicitud: ${errorUpdate.message}`);
    }

    return {
      totalabonado,
      porcentajepagado: Math.round(porcentajepagado * 100) / 100,
    };
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
