import { DashboardRepository } from "../repositories/dashboardRepository";

export class DashboardService {
  static async getDashboardSummary(mes?: string) {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split("T")[0];
    const hace30 = new Date(hoy);
    hace30.setDate(hace30.getDate() - 30);
    const hace30Str = hace30.toISOString().split("T")[0];

    const [
      totalClientes,
      totalSolicitudes,
      totalCuotas,
      cuotasCobradasHoy,
      cuotasVencidasHoy,
      cuotasVencidas30,
      solicitudesRecientes,
      revenueHistory,
      efficiency,
      solicitudesHoy,
      cuotasDetalleHoy,
      montoCobradasHoy,
    ] = await Promise.all([
      DashboardRepository.countClientes(),
      DashboardRepository.countSolicitudes(),
      DashboardRepository.countCuotas(),
      DashboardRepository.countCuotasCobradasEnFecha(hoyStr, mes),
      DashboardRepository.countCuotasVencidasEnFecha(hoyStr, mes),
      DashboardRepository.countCuotasVencidasAntes(hace30Str),
      DashboardRepository.getSolicitudesRecientes(10),
      DashboardRepository.getRevenueHistory(),
      DashboardRepository.getCollectionEfficiency(),
      DashboardRepository.getSolicitudesHoy(mes),
      DashboardRepository.getCuotasCobradasHoy(mes),
      DashboardRepository.getMontoCobradasHoy(mes),
    ]);

    return {
      totals: {
        clientes: totalClientes,
        solicitudes: totalSolicitudes,
        cuotas: totalCuotas,
      },
      kpis: {
        cobradasHoy: cuotasCobradasHoy,
        vencidasHoy: cuotasVencidasHoy,
        vencidas30: cuotasVencidas30,
        montoCobradasHoy,
      },
      recientes: solicitudesRecientes,
      solicitudesHoy,
      cuotasHoy: cuotasDetalleHoy,
      charts: {
        revenue: revenueHistory,
        efficiency,
      },
    };
  }
}

