import { supabase } from "../db";
import {
  Solicitud,
  Cuota,
  SolicitudConDetalles,
  CreateSolicitudDTO,
  UpdateSolicitudDTO,
} from "../types/solicitud";

export class SolicitudRepository {
  /**
   * Obtiene el próximo número de solicitud (fallback numérico).
   */
  static async getNextNroSolicitud(): Promise<number> {
    const { data, error } = await supabase
      .from("solicitud")
      .select("nrosolicitud, idsolicitud")
      .order("idsolicitud", { ascending: false })
      .limit(25);

    if (error) {
      console.error("Error fetching last solicitud:", error.message);
      throw new Error(`Error al obtener solicitud: ${error.message}`);
    }

    const numeric = (data || [])
      .map((row: any) => {
        const fromNro = parseInt(String(row.nrosolicitud || "").trim(), 10);
        if (Number.isFinite(fromNro)) return fromNro;
        if (Number.isFinite(row.idsolicitud)) return Number(row.idsolicitud);
        return NaN;
      })
      .filter((n: number) => Number.isFinite(n));

    const max = numeric.length > 0 ? Math.max(...numeric) : 0;
    return max + 1;
  }

  /**
   * Obtiene todas las solicitudes con detalles de cliente, producto, vendedor
   */
  static async getAllSolicitudes(): Promise<SolicitudConDetalles[]> {
    const { data, error } = await supabase
      .from("solicitud")
      .select(
        `
        *,
        cliente(appynom, dni, direccion, telefono, localidad(nombre)),
        producto(descripcion),
        vendedor(apellidonombre)
      `,
      )
      .order("idsolicitud", { ascending: false });

    if (error) {
      console.error("Error fetching solicitudes:", error.message);
      throw new Error(`Error al obtener solicitudes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Obtiene una solicitud por ID con todos sus detalles
   */
  static async getSolicitudById(
    idsolicitud: number,
  ): Promise<SolicitudConDetalles | null> {
    const { data, error } = await supabase
      .from("solicitud")
      .select(
        `
        *,
        cliente(appynom, dni, direccion, telefono, localidad(nombre)),
        producto(descripcion),
        vendedor(apellidonombre)
      `,
      )
      .eq("idsolicitud", idsolicitud)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching solicitud:", error.message);
      throw new Error(`Error al obtener solicitud: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Obtiene una solicitud por nrosolicitud
   */
  static async getSolicitudByNro(
    nrosolicitud: string,
  ): Promise<SolicitudConDetalles | null> {
    const { data, error } = await supabase
      .from("solicitud")
      .select(
        `
        *,
        cliente(appynom, dni, direccion, telefono, localidad(nombre)),
        producto(descripcion),
        vendedor(apellidonombre)
      `,
      )
      .eq("nrosolicitud", nrosolicitud)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching solicitud by nro:", error.message);
      throw new Error(`Error al obtener solicitud: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Verifica si un nrosolicitud ya existe
   */
  static async nrosolicitudExists(nrosolicitud: string): Promise<boolean> {
    const { count, error } = await supabase
      .from("solicitud")
      .select("idsolicitud", { count: "exact" })
      .eq("nrosolicitud", nrosolicitud);

    if (error) {
      console.error("Error checking nrosolicitud:", error.message);
      return false;
    }

    return (count || 0) > 0;
  }

  /**
   * Crea una nueva solicitud
   */
  static async createSolicitud(dto: CreateSolicitudDTO): Promise<Solicitud> {
    const nroSolicitud =
      dto.nroSolicitud && dto.nroSolicitud.trim().length > 0
        ? dto.nroSolicitud
        : String(await this.getNextNroSolicitud());

    const { data, error } = await supabase
      .from("solicitud")
      .insert([
        {
          relacliente: dto.selectCliente,
          relaproducto: dto.idproducto,
          relavendedor: dto.selectVendedor,
          monto: dto.monto,
          cantidadcuotas: dto.selectCuotas,
          totalabonado: 0,
          nrosolicitud: nroSolicitud,
          totalapagar: dto.totalapagar,
          porcentajepagado: 0,
          observacion: dto.observacion || "",
          estado: 1, // activa
          fechalta: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating solicitud:", error.message);
      throw new Error(`Error al crear solicitud: ${error.message}`);
    }

    return data;
  }

  /**
   * Actualiza una solicitud
   */
  static async updateSolicitud(dto: UpdateSolicitudDTO): Promise<Solicitud> {
    // Primero obtén el totalabonado actual para recalcular porcentaje
    const { data: solicitudActual } = await supabase
      .from("solicitud")
      .select("totalabonado")
      .eq("idsolicitud", dto.idsolicitud)
      .single();

    const totalabonado = solicitudActual?.totalabonado || 0;
    const nuevoPorcentaje = (totalabonado * 100) / dto.totalapagar;
    const porcentajePagado = Math.round(nuevoPorcentaje * 100) / 100;

    const { data, error } = await supabase
      .from("solicitud")
      .update({
        relacliente: dto.selectCliente ?? undefined,
        relavendedor: dto.selectVendedor ?? undefined,
        monto: dto.monto,
        cantidadcuotas: dto.selectCuotas,
        nrosolicitud: dto.nroSolicitud,
        totalapagar: dto.totalapagar,
        relaproducto: dto.idproducto ?? undefined,
        porcentajepagado: porcentajePagado,
        observacion: dto.observacion,
        estado: dto.selectEstado,
      })
      .eq("idsolicitud", dto.idsolicitud)
      .select()
      .single();

    if (error) {
      console.error("Error updating solicitud:", error.message);
      throw new Error(`Error al actualizar solicitud: ${error.message}`);
    }

    return data;
  }

  /**
   * Obtiene todas las cuotas de una solicitud
   */
  static async getCuotasBySolicitud(relasolicitud: number): Promise<Cuota[]> {
    const { data, error } = await supabase
      .from("cuotas")
      .select("*")
      .eq("relasolicitud", relasolicitud)
      .order("nrocuota", { ascending: true });

    if (error) {
      console.error("Error fetching cuotas:", error.message);
      throw new Error(`Error al obtener cuotas: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Crea cuotas para una solicitud
   */
  static async createCuotas(
    idsolicitud: number,
    cantidadcuotas: number,
    monto: number,
    mesInicial?: string,
  ): Promise<void> {
    // Calcula fecha inicial (mes actual, día 20)
    const hoy = new Date();
    let fechaVencimiento = new Date(hoy.getFullYear(), hoy.getMonth(), 20);

    // Si ya pasó el día 20, comienza desde próximo mes
    if (hoy.getDate() > 20) {
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);
    }

    const cuotasArray = [];

    for (let i = 1; i <= cantidadcuotas; i++) {
      // Suma meses para cada cuota
      const vencimiento = new Date(fechaVencimiento);
      vencimiento.setMonth(vencimiento.getMonth() + (i - 1));

      cuotasArray.push({
        relasolicitud: idsolicitud,
        nrocuota: i,
        importe: monto,
        vencimiento: vencimiento.toISOString().split("T")[0], // YYYY-MM-DD
        estado: 0, // impaga
        saldoanterior: 0,
        fecha: null,
      });
    }

    const { error } = await supabase.from("cuotas").insert(cuotasArray);

    if (error) {
      console.error("Error creating cuotas:", error.message);
      throw new Error(`Error al crear cuotas: ${error.message}`);
    }
  }

  /**
   * Actualiza el importe de cuotas impagas
   */
  static async updateCuotasImpagas(
    relasolicitud: number,
    nuevoImporte: number,
  ): Promise<void> {
    const { error } = await supabase
      .from("cuotas")
      .update({ importe: nuevoImporte })
      .eq("relasolicitud", relasolicitud)
      .eq("estado", 0); // solo impagas

    if (error) {
      console.error("Error updating cuotas:", error.message);
      throw new Error(`Error al actualizar cuotas: ${error.message}`);
    }
  }

  /**
   * Agrega cuotas adicionales a una solicitud
   */
  static async adicionarCuotas(
    idsolicitud: number,
    cantidadNueva: number,
  ): Promise<void> {
    // Obtén la última cuota para calcular el siguiente vencimiento
    const { data: ultimaCuota, error: errorCuota } = await supabase
      .from("cuotas")
      .select("*")
      .eq("relasolicitud", idsolicitud)
      .order("nrocuota", { ascending: false })
      .limit(1)
      .single();

    if (errorCuota) {
      throw new Error(`Error al obtener última cuota: ${errorCuota.message}`);
    }

    // Obtén monto de la solicitud
    const { data: solicitud, error: errorSol } = await supabase
      .from("solicitud")
      .select("monto, cantidadcuotas")
      .eq("idsolicitud", idsolicitud)
      .single();

    if (errorSol) {
      throw new Error(`Error al obtener solicitud: ${errorSol.message}`);
    }

    const monto = solicitud.monto;
    const proxNrocuota = ultimaCuota.nrocuota + 1;
    let proxVencimiento = new Date(ultimaCuota.vencimiento);

    const cuotasArray = [];

    for (let i = 0; i < cantidadNueva; i++) {
      proxVencimiento.setMonth(proxVencimiento.getMonth() + 1);

      cuotasArray.push({
        relasolicitud: idsolicitud,
        nrocuota: proxNrocuota + i,
        importe: monto,
        vencimiento: proxVencimiento.toISOString().split("T")[0],
        estado: 0,
        saldoanterior: 0,
        fecha: null,
      });
    }

    // Inserta nuevas cuotas
    const { error: errorInsert } = await supabase
      .from("cuotas")
      .insert(cuotasArray);

    if (errorInsert) {
      throw new Error(`Error al insertar cuotas: ${errorInsert.message}`);
    }

    // Actualiza cantidadcuotas en solicitud
    const nuevaCant = solicitud.cantidadcuotas + cantidadNueva;
    const { error: errorUpdate } = await supabase
      .from("solicitud")
      .update({ cantidadcuotas: nuevaCant })
      .eq("idsolicitud", idsolicitud);

    if (errorUpdate) {
      throw new Error(
        `Error al actualizar cantidadcuotas: ${errorUpdate.message}`,
      );
    }
  }

  /**
   * Actualiza observaciones
   */
  static async updateObservaciones(
    nrosolicitud: string,
    observacion: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("solicitud")
      .update({ observacion })
      .eq("nrosolicitud", nrosolicitud);

    if (error) {
      throw new Error(`Error al actualizar observaciones: ${error.message}`);
    }
  }

  /**
   * Obtiene solicitudes con cuotas pagadas hoy/vencidas
   */
  static async getSolicitudesConFiltro(
    filtro: "pagas" | "impagas" | "bajas",
  ): Promise<any[]> {
    let query = supabase.from("solicitud").select(`
        *,
        cliente(appynom, telefono),
        producto(descripcion),
        cuotas(estado, importe)
      `);

    const hoy = new Date().toISOString().split("T")[0];

    if (filtro === "pagas") {
      // Solicitudes con cuotas pagadas hoy
      query = query
        .filter("cuotas", "eq", `{"estado": 2, "vencimiento": "${hoy}"}`)
        .eq("estado", 1);
    } else if (filtro === "impagas") {
      // Solicitudes con cuotas impagas vencidas hoy
      query = query
        .filter("cuotas", "lte", `{"vencimiento": "${hoy}"}`)
        .filter("cuotas", "eq", `{"estado": 0}`)
        .eq("estado", 1);
    } else if (filtro === "bajas") {
      query = query.eq("estado", 0);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error al filtrar solicitudes: ${error.message}`);
    }

    return data || [];
  }
}
