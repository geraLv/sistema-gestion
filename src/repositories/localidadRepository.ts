import { supabase } from "../db";
import { Localidad } from "../types/localidad";

export class LocalidadRepository {
  /**
   * Obtiene todas las localidades ordenadas por nombre
   */
  static async getAllLocalidades(): Promise<Localidad[]> {
    const { data, error } = await supabase
      .from("localidad")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error fetching localidades:", error.message);
      throw new Error(`Error al obtener localidades: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Obtiene una localidad por ID
   */
  static async getLocalidadById(
    idlocalidad: number,
  ): Promise<Localidad | null> {
    const { data, error } = await supabase
      .from("localidad")
      .select("*")
      .eq("idlocalidad", idlocalidad)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching localidad:", error.message);
      throw new Error(`Error al obtener localidad: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Busca localidades por nombre
   */
  static async searchLocalidades(
    query: string,
    limit: number = 50,
  ): Promise<Localidad[]> {
    const safeLimit = Math.max(1, Math.min(limit, 200));

    const { data, error } = await supabase
      .from("localidad")
      .select("*")
      .ilike("nombre", `%${query}%`)
      .order("nombre", { ascending: true })
      .limit(safeLimit);

    if (error) {
      console.error("Error searching localidades:", error.message);
      throw new Error(`Error al buscar localidades: ${error.message}`);
    }

    return data || [];
  }
}
