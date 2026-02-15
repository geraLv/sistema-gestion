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
}
