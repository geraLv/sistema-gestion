import { supabase } from "../db";
import { Producto } from "../types/producto";

export class ProductoRepository {
  /**
   * Obtiene todos los productos
   */
  static async getAllProductos(): Promise<Producto[]> {
    const { data, error } = await supabase
      .from("producto")
      .select("*")
      .order("descripcion", { ascending: true });

    if (error) {
      console.error("Error fetching productos:", error.message);
      throw new Error(`Error al obtener productos: ${error.message}`);
    }

    return data as Producto[];
  }

  /**
   * Obtiene un producto por ID
   */
  static async getProductoById(relaproducto: number): Promise<Producto | null> {
    const { data, error } = await supabase
      .from("producto")
      .select("*")
      .eq("relaproducto", relaproducto)
      .single();

    if (error) {
      console.error("Error fetching producto:", error.message);
      return null;
    }

    return data as Producto;
  }

  /**
   * Obtiene productos activos
   */
  static async getProductosActivos(): Promise<Producto[]> {
    const { data, error } = await supabase
      .from("producto")
      .select("*")
      .eq("estado", 1)
      .order("descripcion", { ascending: true });

    if (error) {
      throw new Error(`Error al obtener productos: ${error.message}`);
    }

    return data as Producto[];
  }

  /**
   * Busca productos por descripción
   */
  static async buscarProductos(query: string): Promise<Producto[]> {
    const { data, error } = await supabase
      .from("producto")
      .select("*")
      .ilike("descripcion", `%${query}%`)
      .order("descripcion", { ascending: true });

    if (error) {
      throw new Error(`Error al buscar productos: ${error.message}`);
    }

    return data as Producto[];
  }
}
