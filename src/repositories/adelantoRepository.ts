import { supabase } from "../db";
import { Adelanto, AdelantoWithSolicitud } from "../types/adelanto";

export class AdelantoRepository {
  /**
   * Obtiene un adelanto por ID
   */
  static async getAdelantoById(idadelanto: number): Promise<Adelanto | null> {
    const { data, error } = await supabase
      .from("adelanto")
      .select("*")
      .eq("idadelanto", idadelanto)
      .single();

    if (error) {
      console.error("Error fetching adelanto:", error.message);
      return null;
    }

    return data as Adelanto;
  }

  /**
   * Obtiene todos los adelantos de una solicitud
   */
  static async getAdelantosBySolicitud(
    idsolicitud: number,
  ): Promise<Adelanto[]> {
    const { data, error } = await supabase
      .from("adelanto")
      .select("*")
      .eq("relasolicitud", idsolicitud)
      .order("adelantofecha", { ascending: false });

    if (error) {
      throw new Error(`Error al obtener adelantos: ${error.message}`);
    }

    return data as Adelanto[];
  }

  /**
   * Obtiene total de adelantos de una solicitud
   */
  static async getTotalAdelantosBySolicitud(
    idsolicitud: number,
  ): Promise<number> {
    const { data, error } = await supabase
      .from("adelanto")
      .select("adelantoimporte")
      .eq("relasolicitud", idsolicitud);

    if (error) {
      throw new Error(`Error al obtener adelantos: ${error.message}`);
    }

    const adelantos = data as any[];
    return adelantos.reduce((sum, a) => sum + a.adelantoimporte, 0);
  }

  /**
   * Crea un nuevo adelanto
   */
  static async crearAdelanto(
    idsolicitud: number,
    adelantoimporte: number,
  ): Promise<Adelanto> {
    const hoy = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("adelanto")
      .insert({
        relasolicitud: idsolicitud,
        adelantoimporte,
        adelantofecha: hoy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear adelanto: ${error.message}`);
    }

    return data as Adelanto;
  }

  /**
   * Obtiene adelantos con detalles de solicitud
   */
  static async getAdelantosWithDetails(): Promise<AdelantoWithSolicitud[]> {
    const { data, error } = await supabase
      .from("adelanto")
      .select(
        `
        idadelanto, relasolicitud, adelantoimporte, adelantofecha,
        solicitud:relasolicitud(nrosolicitud, idsolicitud)
      `,
      )
      .order("adelantofecha", { ascending: false });

    if (error) {
      throw new Error(`Error al obtener adelantos: ${error.message}`);
    }

    return data as AdelantoWithSolicitud[];
  }
}
