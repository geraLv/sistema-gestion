import { supabase } from "../db";
import { ReciboCuotaData, SolicitudReporteRow } from "../types/reporte";

type EstadoSolicitudes = "impagas" | "pagas" | "bajas";

export class ReporteRepository {
  static async getReciboCuotaData(
    idcuota: number,
  ): Promise<ReciboCuotaData | null> {
    const { data, error } = await supabase
      .from("cuotas")
      .select(
        `
        idcuota, nrocuota, importe, vencimiento, estado, fecha,
        solicitud:relasolicitud(
          nrosolicitud, estado,
          cliente:relacliente(appynom, dni, direccion, telefono, localidad:relalocalidad(nombre)),
          producto:relaproducto(descripcion)
        )
      `,
      )
      .eq("idcuota", idcuota)
      .limit(1);

    if (error) {
      console.error("Error fetching recibo cuota:", error.message);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn(`[ReporteService] Cuota ${idcuota} no encontrada (0 filas).`);
      return null;
    }

    const row = data[0];
    const solicitud = Array.isArray((row as any).solicitud)
      ? (row as any).solicitud[0]
      : (row as any).solicitud;
    const cliente = Array.isArray(solicitud?.cliente)
      ? solicitud.cliente[0]
      : solicitud?.cliente;
    const producto = Array.isArray(solicitud?.producto)
      ? solicitud.producto[0]
      : solicitud?.producto;
    const localidad = Array.isArray(cliente?.localidad)
      ? cliente.localidad[0]
      : cliente?.localidad;

    // Check payment status with logging
    if ((row as any).estado !== 2) {
      console.warn(
        `[ReporteService] Cuota ${idcuota} no está pagada. Estado: ${(row as any).estado}`,
      );
    }

    if (!solicitud || !cliente || !producto) {
      console.warn(
        `[ReporteService] Datos incompletos para cuota ${idcuota}:`,
        { solicitud: !!solicitud, cliente: !!cliente, producto: !!producto },
      );
      return null;
    }

    return {
      idcuota: (row as any).idcuota,
      nrocuota: (row as any).nrocuota,
      importe: (row as any).importe,
      vencimiento: (row as any).vencimiento,
      fecha: (row as any).fecha ?? null,
      nrosolicitud: solicitud.nrosolicitud,
      cliente: {
        appynom: cliente.appynom,
        dni: cliente.dni,
        direccion: cliente.direccion,
        telefono: cliente.telefono,
        localidad: localidad?.nombre || "",
      },
      producto: {
        descripcion: producto.descripcion,
      },
    };
  }

  static async getRecibosMultiplesData(
    idcuotas: number[],
  ): Promise<ReciboCuotaData[]> {
    if (!idcuotas || idcuotas.length === 0) return [];

    console.log(`[ReporteRepository] Fetching multiples: ${idcuotas.join(",")}`);

    const { data, error } = await supabase
      .from("cuotas")
      .select(
        `
        idcuota, nrocuota, importe, vencimiento, estado, fecha,
        solicitud:relasolicitud(
          nrosolicitud, estado,
          cliente:relacliente(appynom, dni, direccion, telefono, localidad:relalocalidad(nombre)),
          producto:relaproducto(descripcion)
        )
      `,
      )
      .in("idcuota", idcuotas)
      .order("nrocuota", { ascending: true });

    console.log(data, error);
    if (error) {
      console.error("Error fetching recibos multiples:", error.message);
      return [];
    }

    return (data || [])
      .map((row: any) => {
        // Log status if not 2
        if (row.estado !== 2) {
          console.warn(
            `[ReporteService] Multiple: Cuota ${row.idcuota} omitida. Estado: ${row.estado}`,
          );
          // If strict mode, return null. User implies they WANT it to work if paid.
          // return null;
        }

        const solicitud = Array.isArray(row.solicitud)
          ? row.solicitud[0]
          : row.solicitud;
        const cliente = Array.isArray(solicitud?.cliente)
          ? solicitud.cliente[0]
          : solicitud?.cliente;
        const producto = Array.isArray(solicitud?.producto)
          ? solicitud.producto[0]
          : solicitud?.producto;
        const localidad = Array.isArray(cliente?.localidad)
          ? cliente.localidad[0]
          : cliente?.localidad;

        if (!solicitud || !cliente || !producto) {
          console.warn(
            `[ReporteService] Multiple: Datos incompletos para cuota ${row.idcuota}`,
            { solicitud: !!solicitud, cliente: !!cliente, producto: !!producto },
          );
          return null;
        }

        return {
          idcuota: row.idcuota,
          nrocuota: row.nrocuota,
          importe: row.importe,
          vencimiento: row.vencimiento,
          fecha: row.fecha ?? null,
          nrosolicitud: solicitud.nrosolicitud,
          cliente: {
            appynom: cliente.appynom,
            dni: cliente.dni,
            direccion: cliente.direccion,
            telefono: cliente.telefono,
            localidad: localidad?.nombre || "",
          },
          producto: {
            descripcion: producto.descripcion,
          },
        } as ReciboCuotaData;
      })
      .filter(Boolean) as ReciboCuotaData[];
  }

  static async getRecibosSolicitudPagadosData(
    idsolicitud: number,
  ): Promise<ReciboCuotaData[]> {
    const { data, error } = await supabase
      .from("cuotas")
      .select(
        `
        idcuota, nrocuota, importe, vencimiento, estado, fecha,
        solicitud:relasolicitud(
          nrosolicitud,
          cliente:relacliente(appynom, dni, direccion, telefono, localidad:relalocalidad(nombre)),
          producto:relaproducto(descripcion)
        )
      `,
      )
      .eq("relasolicitud", idsolicitud)
      .eq("estado", 2)
      .order("nrocuota", { ascending: true });

    if (error) {
      throw new Error(
        `Error al obtener recibos de solicitud: ${error.message}`,
      );
    }

    return (data || [])
      .map((row: any) => {
        const solicitud = Array.isArray(row.solicitud)
          ? row.solicitud[0]
          : row.solicitud;
        const cliente = Array.isArray(solicitud?.cliente)
          ? solicitud.cliente[0]
          : solicitud?.cliente;
        const producto = Array.isArray(solicitud?.producto)
          ? solicitud.producto[0]
          : solicitud?.producto;
        const localidad = Array.isArray(cliente?.localidad)
          ? cliente.localidad[0]
          : cliente?.localidad;

        if (!solicitud || !cliente || !producto) return null;

        return {
          idcuota: row.idcuota,
          nrocuota: row.nrocuota,
          importe: row.importe,
          vencimiento: row.vencimiento,
          fecha: row.fecha ?? null,
          nrosolicitud: solicitud.nrosolicitud,
          cliente: {
            appynom: cliente.appynom,
            dni: cliente.dni,
            direccion: cliente.direccion,
            telefono: cliente.telefono,
            localidad: localidad?.nombre || "",
          },
          producto: {
            descripcion: producto.descripcion,
          },
        } as ReciboCuotaData;
      })
      .filter(Boolean) as ReciboCuotaData[];
  }

  static async getRecibosMesData(
    mes: string,
    localidadId?: number,
  ): Promise<ReciboCuotaData[]> {
    const [anio, mesNum] = mes.split("-").map(Number);
    const ultimoDiaMes = new Date(anio, mesNum, 0).getDate();
    const primerDia = `${mes}-01`;
    const ultimoDia = `${mes}-${String(ultimoDiaMes).padStart(2, "0")}`;

    let allData: any[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
      let query = supabase
        .from("cuotas")
        .select(
          `
          idcuota, nrocuota, importe, vencimiento, estado, fecha,
          solicitud:relasolicitud!inner(
            nrosolicitud, estado,
            cliente:relacliente!inner(appynom, dni, direccion, telefono, relalocalidad, localidad:relalocalidad(nombre)),
            producto:relaproducto(descripcion)
          )
        `
        )
        .eq("estado", 0)
        .eq("solicitud.estado", 1)
        .gte("vencimiento", primerDia)
        .lte("vencimiento", ultimoDia)
        .order("idcuota", { ascending: true })
        .range(from, from + step - 1);

      if (localidadId !== undefined) {
        query = query.eq("solicitud.cliente.relalocalidad", localidadId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching recibos mes:", error.message);
        throw new Error(`Error al obtener recibos del mes: ${error.message}`);
      }

      const rowsChunk = data || [];
      if (rowsChunk.length > 0) {
        allData = allData.concat(rowsChunk);
      }

      if (rowsChunk.length < step) {
        break;
      }
      from += step;
    }

    const rows = allData.map((row) => {
      const solicitud = Array.isArray(row.solicitud)
        ? row.solicitud[0]
        : row.solicitud;
      const cliente = Array.isArray(solicitud?.cliente)
        ? solicitud.cliente[0]
        : solicitud?.cliente;
      const producto = Array.isArray(solicitud?.producto)
        ? solicitud.producto[0]
        : solicitud?.producto;
      const localidad = Array.isArray(cliente?.localidad)
        ? cliente.localidad[0]
        : cliente?.localidad;

      return {
        idcuota: row.idcuota,
        nrocuota: row.nrocuota,
        importe: row.importe,
        vencimiento: row.vencimiento,
        fecha: row.fecha ?? null,
        nrosolicitud: solicitud?.nrosolicitud || "",
        cliente: {
          appynom: cliente?.appynom || "",
          dni: cliente?.dni || "",
          direccion: cliente?.direccion || "",
          telefono: cliente?.telefono || "",
          localidad: localidad?.nombre || "",
        },
        producto: {
          descripcion: producto?.descripcion || "",
        },
      };
    });

    return rows as ReciboCuotaData[];
  }

  static async getSolicitudesReporteData(
    estado: EstadoSolicitudes,
    mes: string,
    modo: "resumen" | "detalle" = "resumen",
  ): Promise<SolicitudReporteRow[]> {
    const vencimientoMes = `${mes}-20`;

    let allData: any[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("cuotas")
        .select(
          `
          idcuota, nrocuota, importe, vencimiento, estado, relasolicitud,
          solicitud:relasolicitud(
            idsolicitud, nrosolicitud, estado,
            cliente:relacliente(appynom, telefono),
            producto:relaproducto(descripcion)
          )
        `,
        )
        .eq("vencimiento", vencimientoMes)
        .order("idcuota", { ascending: true })
        .range(from, from + step - 1);

      if (error) {
        throw new Error(`Error al obtener solicitudes: ${error.message}`);
      }

      const rowsChunk = data || [];
      if (rowsChunk.length > 0) {
        allData = allData.concat(rowsChunk);
      }

      if (rowsChunk.length < step) {
        break;
      }
      from += step;
    }

    const rows = allData.map((row: any) => {
      const solicitud = Array.isArray(row.solicitud)
        ? row.solicitud[0]
        : row.solicitud;
      const cliente = Array.isArray(solicitud?.cliente)
        ? solicitud.cliente[0]
        : solicitud?.cliente;
      const producto = Array.isArray(solicitud?.producto)
        ? solicitud.producto[0]
        : solicitud?.producto;

      return {
        idsolicitud: solicitud?.idsolicitud ?? row.relasolicitud ?? null,
        solicitud: solicitud?.nrosolicitud || "",
        solicitudEstado: solicitud?.estado ?? null,
        cliente: cliente?.appynom || "",
        telefono: cliente?.telefono || "",
        producto: producto?.descripcion || "",
        nrocuota: row.nrocuota ?? 0,
        importe: row.importe ?? 0,
        vencimiento: row.vencimiento,
        cuotaEstado: row.estado ?? null,
      };
    });

    const base = rows.filter((r) => {
      if (estado === "bajas") {
        return r.solicitudEstado === 0;
      }
      if (estado === "impagas") {
        return r.solicitudEstado === 1 && r.cuotaEstado === 0;
      }
      return r.solicitudEstado === 1 && r.cuotaEstado === 2;
    });

    // Mantener orden estable por nrosolicitud como en SQL original
    base.sort((a, b) =>
      String(a.solicitud ?? "").localeCompare(String(b.solicitud ?? "")),
    );

    if (modo === "detalle") {
      return base.map((r) => ({
        solicitud: r.solicitud,
        cliente: r.cliente,
        telefono: r.telefono,
        producto: r.producto,
        nrocuota: r.nrocuota,
        importe: r.importe,
        vencimiento: r.vencimiento,
      }));
    }

    if (estado === "pagas") {
      // PHP: SUM(cu.importe) y GROUP BY cliente
      const map = new Map<string, SolicitudReporteRow>();
      for (const r of base) {
        const key = r.cliente || "";
        const prev = map.get(key);
        if (!prev) {
          map.set(key, {
            solicitud: r.solicitud,
            cliente: r.cliente,
            telefono: r.telefono,
            producto: r.producto,
            nrocuota: r.nrocuota,
            importe: r.importe,
            vencimiento: r.vencimiento,
          });
        } else {
          prev.importe += r.importe;
        }
      }
      return Array.from(map.values());
    }

    if (estado === "bajas") {
      // PHP: subquery suma cuotas pagadas por solicitud, luego GROUP BY cliente
      const solicitudIds = Array.from(
        new Set(
          base
            .map((r: any) => r.idsolicitud)
            .filter((id: any) => Number.isFinite(id)),
        ),
      ) as number[];

      const sumBySolicitud = new Map<number, number>();
      if (solicitudIds.length > 0) {
        const { data: cuotasPagadas, error: errPagadas } = await supabase
          .from("cuotas")
          .select("relasolicitud, importe")
          .eq("estado", 2)
          .in("relasolicitud", solicitudIds);

        if (errPagadas) {
          throw new Error(
            `Error al obtener cuotas pagadas: ${errPagadas.message}`,
          );
        }

        for (const c of cuotasPagadas || []) {
          const id = (c as any).relasolicitud as number;
          const imp = (c as any).importe as number;
          sumBySolicitud.set(id, (sumBySolicitud.get(id) || 0) + imp);
        }
      }

      const map = new Map<string, SolicitudReporteRow>();
      for (const r of base as any[]) {
        const key = r.cliente || "";
        if (!map.has(key)) {
          map.set(key, {
            solicitud: r.solicitud,
            cliente: r.cliente,
            telefono: r.telefono,
            producto: r.producto,
            nrocuota: r.nrocuota,
            importe: sumBySolicitud.get(r.idsolicitud) || 0,
            vencimiento: r.vencimiento,
          });
        }
      }
      return Array.from(map.values());
    }

    // impagas: PHP agrupa por cliente sin agregación -> tomamos la primera fila por cliente
    const map = new Map<string, SolicitudReporteRow>();
    for (const r of base) {
      const key = r.cliente || "";
      if (!map.has(key)) {
        map.set(key, {
          solicitud: r.solicitud,
          cliente: r.cliente,
          telefono: r.telefono,
          producto: r.producto,
          nrocuota: r.nrocuota,
          importe: r.importe,
          vencimiento: r.vencimiento,
        });
      }
    }
    return Array.from(map.values());
  }
}
