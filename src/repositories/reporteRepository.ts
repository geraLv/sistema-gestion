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
        idcuota, nrocuota, importe, vencimiento,
        solicitud:relasolicitud(
          nrosolicitud, estado,
          cliente:relacliente(appynom, dni, direccion, telefono, localidad:relalocalidad(nombre)),
          producto:relaproducto(descripcion)
        )
      `,
      )
      .eq("idcuota", idcuota)
      .single();

    if (error) {
      console.error("Error fetching recibo cuota:", error.message);
      return null;
    }

    const solicitud = Array.isArray((data as any).solicitud)
      ? (data as any).solicitud[0]
      : (data as any).solicitud;
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
      return null;
    }

    return {
      idcuota: (data as any).idcuota,
      nrocuota: (data as any).nrocuota,
      importe: (data as any).importe,
      vencimiento: (data as any).vencimiento,
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

  static async getRecibosSolicitudPagadosData(
    idsolicitud: number,
  ): Promise<ReciboCuotaData[]> {
    const { data, error } = await supabase
      .from("cuotas")
      .select(
        `
        idcuota, nrocuota, importe, vencimiento, estado,
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
    const { data, error } = await supabase
      .from("cuotas")
      .select(
        `
        idcuota, nrocuota, importe, vencimiento, estado,
        solicitud:relasolicitud(
          nrosolicitud, estado,
          cliente:relacliente(appynom, dni, direccion, telefono, relalocalidad, localidad:relalocalidad(nombre)),
          producto:relaproducto(descripcion)
        )
      `,
      )
      .eq("estado", 0);

    if (error) {
      console.error("Error fetching recibos mes:", error.message);
      throw new Error(`Error al obtener recibos del mes: ${error.message}`);
    }

    if (process.env.DEBUG_REPORTES === "true") {
      console.log("[reportes] recibos mes raw:", {
        mes,
        localidadId,
        total: (data || []).length,
        sample: (data || []).slice(0, 2),
      });
    }

    const rows = (data || []).map((row: any) => {
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
        nrosolicitud: solicitud?.nrosolicitud || "",
        solicitudEstado: solicitud?.estado ?? null,
        cliente: {
          appynom: cliente?.appynom || "",
          dni: cliente?.dni || "",
          direccion: cliente?.direccion || "",
          telefono: cliente?.telefono || "",
          localidad: localidad?.nombre || "",
          relalocalidad: cliente?.relalocalidad ?? null,
        },
        producto: {
          descripcion: producto?.descripcion || "",
        },
      };
    });

    const filtrados = rows
      .filter((r) => Number(r.solicitudEstado) === 1)
      .filter((r) => String(r.vencimiento || "").startsWith(mes))
      .filter((r) =>
        localidadId ? Number(r.cliente.relalocalidad) === localidadId : true,
      );

    if (process.env.DEBUG_REPORTES === "true") {
      console.log("[reportes] recibos mes filtrados:", {
        mes,
        localidadId,
        total: filtrados.length,
        sample: filtrados.slice(0, 2),
      });
    }

    return filtrados.map((r) => ({
        idcuota: r.idcuota,
        nrocuota: r.nrocuota,
        importe: r.importe,
        vencimiento: r.vencimiento,
        nrosolicitud: r.nrosolicitud,
        cliente: {
          appynom: r.cliente.appynom,
          dni: r.cliente.dni,
          direccion: r.cliente.direccion,
          telefono: r.cliente.telefono,
          localidad: r.cliente.localidad,
        },
        producto: {
          descripcion: r.producto.descripcion,
        },
      }));
  }

  static async getSolicitudesReporteData(
    estado: EstadoSolicitudes,
    mes: string,
    modo: "resumen" | "detalle" = "resumen",
  ): Promise<SolicitudReporteRow[]> {
    const vencimientoMes = `${mes}-20`;

    const { data, error } = await supabase
      .from("cuotas")
      .select(
        `
        nrocuota, importe, vencimiento, estado, relasolicitud,
        solicitud:relasolicitud(
          idsolicitud, nrosolicitud, estado,
          cliente:relacliente(appynom, telefono),
          producto:relaproducto(descripcion)
        )
      `,
      )
      .eq("vencimiento", vencimientoMes);

    if (error) {
      throw new Error(`Error al obtener solicitudes: ${error.message}`);
    }

    const rows = (data || []).map((row: any) => {
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
