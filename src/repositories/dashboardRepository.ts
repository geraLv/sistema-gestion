import { supabase } from "../db";

export class DashboardRepository {
  static async countClientes(): Promise<number> {
    const { count, error } = await supabase
      .from("cliente")
      .select("idcliente", { count: "exact", head: true });

    if (error) {
      throw new Error(`Error al contar clientes: ${error.message}`);
    }

    return count || 0;
  }

  static async countSolicitudes(): Promise<number> {
    const { count, error } = await supabase
      .from("solicitud")
      .select("idsolicitud", { count: "exact", head: true });

    if (error) {
      throw new Error(`Error al contar solicitudes: ${error.message}`);
    }

    return count || 0;
  }

  static async countCuotas(): Promise<number> {
    const { count, error } = await supabase
      .from("cuotas")
      .select("idcuota", { count: "exact", head: true });

    if (error) {
      throw new Error(`Error al contar cuotas: ${error.message}`);
    }

    return count || 0;
  }

  static async countCuotasCobradasEnFecha(fecha: string): Promise<number> {
    const { count, error } = await supabase
      .from("cuotas")
      .select("idcuota", { count: "exact", head: true })
      .eq("estado", 2)
      .eq("fecha", fecha);

    if (error) {
      throw new Error(`Error al contar cuotas cobradas: ${error.message}`);
    }

    return count || 0;
  }

  static async countCuotasVencidasEnFecha(fecha: string): Promise<number> {
    const { count, error } = await supabase
      .from("cuotas")
      .select("idcuota", { count: "exact", head: true })
      .eq("estado", 0)
      .eq("vencimiento", fecha);

    if (error) {
      throw new Error(`Error al contar cuotas vencidas: ${error.message}`);
    }

    return count || 0;
  }

  static async countCuotasVencidasAntes(fecha: string): Promise<number> {
    const { count, error } = await supabase
      .from("cuotas")
      .select("idcuota", { count: "exact", head: true })
      .eq("estado", 0)
      .lt("vencimiento", fecha);

    if (error) {
      throw new Error(`Error al contar cuotas vencidas 30+: ${error.message}`);
    }

    return count || 0;
  }

  static async getSolicitudesRecientes(limit = 10): Promise<any[]> {
    const { data, error } = await supabase
      .from("solicitud")
      .select(
        `
        idsolicitud,
        nrosolicitud,
        monto,
        totalapagar,
        estado,
        cliente(appynom)
      `,
      )
      .order("idsolicitud", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Error al obtener solicitudes recientes: ${error.message}`);
    }

    return (data || []).map((row: any) => {
      const cliente = Array.isArray(row.cliente) ? row.cliente[0] : row.cliente;
      return {
        id: row.idsolicitud,
        nroSolicitud: row.nrosolicitud,
        clienteNombre: cliente?.appynom || "",
        importe: row.monto || row.totalapagar || 0,
        estado: row.estado,
      };
    });
  }

  static async getRevenueHistory(months = 6): Promise<any[]> {
    const today = new Date();
    const history = [];

    for (let i = 0; i < months; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      // Total collected (estado = 2, fecha within range)
      const { data: collected, error: errorCollected } = await supabase
        .from("cuotas")
        .select("importe")
        .eq("estado", 2)
        .gte("fecha", startOfMonth)
        .lte("fecha", endOfMonth);

      if (errorCollected) {
        console.error("Error fetching revenue history:", errorCollected);
        continue;
      }

      const total = (collected || []).reduce((acc: number, curr: any) => acc + curr.importe, 0);

      const monthName = date.toLocaleDateString('es-AR', { month: 'short' });
      history.unshift({ month: monthName, total });
    }

    return history;
  }

  static async getCollectionEfficiency(): Promise<{ expected: number; collected: number }> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

    // Expected: All cuotas with vencimiento in this month
    const { data: expectedData, error: expectedError } = await supabase
      .from("cuotas")
      .select("importe")
      .gte("vencimiento", startOfMonth)
      .lte("vencimiento", endOfMonth);

    // Collected: All cuotas with fecha (payment date) in this month
    const { data: collectedData, error: collectedError } = await supabase
      .from("cuotas")
      .select("importe")
      .eq("estado", 2)
      .gte("fecha", startOfMonth)
      .lte("fecha", endOfMonth);

    if (expectedError || collectedError) {
      console.error("Error fetching efficiency stats", expectedError || collectedError);
      return { expected: 0, collected: 0 };
    }

    const expected = (expectedData || []).reduce((acc: number, c: any) => acc + c.importe, 0);
    const collected = (collectedData || []).reduce((acc: number, c: any) => acc + c.importe, 0);

    return { expected, collected };
  }

  /**
   * Solicitudes creadas hoy con detalle de cliente, producto y vendedor
   */
  static async getSolicitudesHoy(): Promise<any[]> {
    const hoy = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("solicitud")
      .select(
        `
        idsolicitud,
        nrosolicitud,
        monto,
        totalapagar,
        cantidadcuotas,
        estado,
        fechalta,
        cliente(appynom, dni),
        producto(descripcion),
        vendedor:app_user!relausuario(nombre)
      `,
      )
      .gte("fechalta", `${hoy}T00:00:00`)
      .lte("fechalta", `${hoy}T23:59:59`)
      .order("idsolicitud", { ascending: false });

    if (error) {
      throw new Error(`Error al obtener solicitudes de hoy: ${error.message}`);
    }

    return (data || []).map((row: any) => {
      const cliente = Array.isArray(row.cliente) ? row.cliente[0] : row.cliente;
      const producto = Array.isArray(row.producto) ? row.producto[0] : row.producto;
      const vendedor = Array.isArray(row.vendedor) ? row.vendedor[0] : row.vendedor;
      return {
        id: row.idsolicitud,
        nroSolicitud: row.nrosolicitud,
        clienteNombre: cliente?.appynom || "",
        clienteDni: cliente?.dni || "",
        productoDescripcion: producto?.descripcion || "",
        vendedorNombre: vendedor?.nombre || vendedor?.apellidonombre || "",
        monto: row.monto || 0,
        totalapagar: row.totalapagar || 0,
        cantidadcuotas: row.cantidadcuotas || 0,
        estado: row.estado,
        fechalta: row.fechalta,
      };
    });
  }

  /**
   * Cuotas cobradas hoy con detalle de solicitud y cliente
   */
  static async getCuotasCobradasHoy(): Promise<any[]> {
    const hoy = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("cuotas")
      .select(
        `
        idcuota,
        nrocuota,
        importe,
        fecha,
        solicitud:relasolicitud(
          nrosolicitud,
          cliente(appynom)
        )
      `,
      )
      .eq("estado", 2)
      .eq("fecha", hoy)
      .order("idcuota", { ascending: false });

    if (error) {
      throw new Error(`Error al obtener cobros de hoy: ${error.message}`);
    }

    return (data || []).map((row: any) => {
      const solicitud = Array.isArray(row.solicitud) ? row.solicitud[0] : row.solicitud;
      const cliente = solicitud
        ? Array.isArray(solicitud.cliente)
          ? solicitud.cliente[0]
          : solicitud.cliente
        : null;
      return {
        id: row.idcuota,
        nrocuota: row.nrocuota,
        importe: row.importe || 0,
        fecha: row.fecha,
        nroSolicitud: solicitud?.nrosolicitud || "",
        clienteNombre: cliente?.appynom || "",
      };
    });
  }

  /**
   * Monto total cobrado hoy
   */
  static async getMontoCobradasHoy(): Promise<number> {
    const hoy = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("cuotas")
      .select("importe")
      .eq("estado", 2)
      .eq("fecha", hoy);

    if (error) {
      throw new Error(`Error al calcular monto cobrado hoy: ${error.message}`);
    }

    return (data || []).reduce((acc: number, c: any) => acc + (c.importe || 0), 0);
  }
}
