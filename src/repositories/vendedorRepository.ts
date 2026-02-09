import { supabase } from "../db";
import { Vendedor } from "../types/vendedor";

export class VendedorRepository {
  /**
   * Obtiene todos los vendedores
   */
  static async getAllVendedores(): Promise<Vendedor[]> {
    const { data, error } = await supabase
      .from("vendedor")
      .select("*")
      .order("apellidonombre", { ascending: true });

    if (error) {
      console.error("Error fetching vendedores:", error.message);
      throw new Error(`Error al obtener vendedores: ${error.message}`);
    }

    return data as Vendedor[];
  }

  /**
   * Obtiene un vendedor por ID
   */
  static async getVendedorById(idvendedor: number): Promise<Vendedor | null> {
    const { data, error } = await supabase
      .from("vendedor")
      .select("*")
      .eq("idvendedor", idvendedor)
      .single();

    if (error) {
      console.error("Error fetching vendedor:", error.message);
      return null;
    }

    return data as Vendedor;
  }

  /**
   * Obtiene vendedores activos
   */
  static async getVendedoresActivos(): Promise<Vendedor[]> {
    const { data, error } = await supabase
      .from("vendedor")
      .select("*")
      .eq("estado", 1)
      .order("apellidonombre", { ascending: true });

    if (error) {
      throw new Error(`Error al obtener vendedores: ${error.message}`);
    }

    return data as Vendedor[];
  }

  /**
   * Busca vendedores por nombre
   */
  static async buscarVendedores(query: string): Promise<Vendedor[]> {
    const { data, error } = await supabase
      .from("vendedor")
      .select("*")
      .ilike("apellidonombre", `%${query}%`)
      .order("apellidonombre", { ascending: true });

    if (error) {
      throw new Error(`Error al buscar vendedores: ${error.message}`);
    }

    return data as Vendedor[];
  }

  /**
   * Crea un vendedor
   */
  static async createVendedor(
    apellidonombre: string,
    estado: number = 1,
  ): Promise<Vendedor> {
    const { data, error } = await supabase
      .from("vendedor")
      .insert([
        {
          apellidonombre,
          estado,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear vendedor: ${error.message}`);
    }

    return data as Vendedor;
  }

  /**
   * Actualiza un vendedor
   */
  static async updateVendedor(
    idvendedor: number,
    apellidonombre: string,
  ): Promise<Vendedor> {
    const { data, error } = await supabase
      .from("vendedor")
      .update({ apellidonombre })
      .eq("idvendedor", idvendedor)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al actualizar vendedor: ${error.message}`);
    }

    return data as Vendedor;
  }

  /**
   * Actualiza estado (alta/baja)
   */
  static async setVendedorStatus(
    idvendedor: number,
    estado: number,
  ): Promise<void> {
    const { error } = await supabase
      .from("vendedor")
      .update({ estado })
      .eq("idvendedor", idvendedor);

    if (error) {
      throw new Error(`Error al actualizar estado: ${error.message}`);
    }
  }
}
