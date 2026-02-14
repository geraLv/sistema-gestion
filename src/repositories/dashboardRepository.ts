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
}
