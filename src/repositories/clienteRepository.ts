import { supabase } from "../db";
import {
  Cliente,
  ClienteWithLocalidad,
  CreateClienteDTO,
  UpdateClienteDTO,
} from "../types/cliente";

export class ClienteRepository {
  /**
   * Obtiene todos los clientes con sus datos de localidad
   */
  static async getAllClientes(
    q?: string,
    page?: number,
    pageSize?: number,
  ): Promise<{ data: ClienteWithLocalidad[]; total: number }> {
    let query = supabase
      .from("cliente")
      .select(
        `
        idcliente,
        appynom,
        dni,
        direccion,
        telefono,
        email,
        relalocalidad,
        condicion,
        fechalta,
        fecha_nacimiento,
        localidad(nombre) 
      `,
        { count: "exact" },
      )
      .order("appynom", { ascending: true });

    const queryTerm = q?.trim();
    if (queryTerm) {
      // Logic for "Smart Search"
      const hasNumbers = /\d/.test(queryTerm);
      const cleanTerm = queryTerm.replace(/\D/g, "");

      if (hasNumbers && cleanTerm.length > 0) {
        // Generate variations to match DB formats (dots vs no dots)
        const variations = [queryTerm, cleanTerm];

        // Try to format as DNI xx.xxx.xxx if length is appropriate
        // 7 digits: x.xxx.xxx
        // 8 digits: xx.xxx.xxx
        if (cleanTerm.length === 7) {
          const formatted = cleanTerm.replace(/(\d{1})(\d{3})(\d{3})/, "$1.$2.$3");
          variations.push(formatted);
        } else if (cleanTerm.length === 8) {
          const formatted = cleanTerm.replace(/(\d{2})(\d{3})(\d{3})/, "$1.$2.$3");
          variations.push(formatted);
        }

        const filters = [`appynom.ilike.%${queryTerm}%`];

        variations.forEach(v => {
          filters.push(`dni.eq.${v}`);
          filters.push(`dni.ilike.%${v}%`);
        });

        const uniqueFilters = [...new Set(filters)];
        query = query.or(uniqueFilters.join(","));
      } else {
        query = query.ilike("appynom", `%${queryTerm}%`);
      }
    }

    const size = pageSize && pageSize > 0 ? pageSize : undefined;
    const currentPage = page && page > 0 ? page : 1;
    if (size) {
      const from = (currentPage - 1) * size;
      const to = from + size - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching clientes:", error.message);
      throw new Error(`Error al obtener clientes: ${error.message}`);
    }

    return { data: data || [], total: count || 0 };
  }

  /**
   * Obtiene un cliente por ID con sus datos de localidad
   */
  static async getClienteById(
    idcliente: number,
  ): Promise<ClienteWithLocalidad | null> {
    const { data, error } = await supabase
      .from("cliente")
      .select(
        `
        idcliente,
        appynom,
        dni,
        direccion,
        telefono,
        email,
        relalocalidad,
        condicion,
        fechalta,
        fecha_nacimiento,
        localidad(nombre)
      `,
      )
      .eq("idcliente", idcliente)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching cliente:", error.message);
      throw new Error(`Error al obtener cliente: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Crea un nuevo cliente
   */
  static async createCliente(dto: CreateClienteDTO): Promise<Cliente> {
    const { data, error } = await supabase
      .from("cliente")
      .insert([
        {
          appynom: dto.appynom,
          dni: dto.dni,
          direccion: dto.direccion,
          telefono: dto.telefono,
          email: dto.email,
          relalocalidad: dto.selectLocalidades,
          condicion: 1, // activo por defecto
          fechalta: new Date().toISOString(),
          fecha_nacimiento: dto.fecha_nacimiento || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating cliente:", error.message);
      throw new Error(`Error al crear cliente: ${error.message}`);
    }

    return data;
  }

  /**
   * Actualiza un cliente existente
   */
  static async updateCliente(dto: UpdateClienteDTO): Promise<Cliente> {
    const { data, error } = await supabase
      .from("cliente")
      .update({
        appynom: dto.appynom,
        dni: dto.dni,
        direccion: dto.direccion,
        telefono: dto.telefono,
        email: dto.email,
        relalocalidad: dto.selectLocalidades,
        fecha_nacimiento: dto.fecha_nacimiento || null,
      })
      .eq("idcliente", dto.idcliente)
      .select()
      .single();

    if (error) {
      console.error("Error updating cliente:", error.message);
      throw new Error(`Error al actualizar cliente: ${error.message}`);
    }

    return data;
  }

  /**
   * Busca clientes por nombre o DNI (limitado a 50)
   */
  static async searchClientes(query: string): Promise<ClienteWithLocalidad[]> {
    const queryTerm = query.trim();
    const hasNumbers = /\d/.test(queryTerm);
    const cleanTerm = queryTerm.replace(/\D/g, "");

    let dbQuery = supabase
      .from("cliente")
      .select(
        `
        idcliente,
        appynom,
        dni,
        direccion,
        telefono,
        email,
        relalocalidad,
        condicion,
        fechalta,
        fecha_nacimiento,
        localidad(nombre)
      `,
      )
      .limit(50);

    if (hasNumbers && cleanTerm.length > 0) {
      const variations = [queryTerm, cleanTerm];
      if (cleanTerm.length === 7) {
        variations.push(cleanTerm.replace(/(\d{1})(\d{3})(\d{3})/, "$1.$2.$3"));
      } else if (cleanTerm.length === 8) {
        variations.push(cleanTerm.replace(/(\d{2})(\d{3})(\d{3})/, "$1.$2.$3"));
      }

      const filters = [`appynom.ilike.%${queryTerm}%`];
      variations.forEach(v => {
        // For quick search, simple ilike is usually enough, but let's match exact too just in case
        filters.push(`dni.ilike.%${v}%`);
      });

      const uniqueFilters = [...new Set(filters)];
      dbQuery = dbQuery.or(uniqueFilters.join(","));
    } else {
      dbQuery = dbQuery.ilike("appynom", `%${queryTerm}%`);
    }

    // Sort by name
    dbQuery = dbQuery.order("appynom", { ascending: true });

    const { data, error } = await dbQuery;

    if (error) {
      console.error("Error searching clientes:", error.message);
      throw new Error(`Error al buscar clientes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Verifica si un DNI ya existe
   */
  static async dniExists(dni: string, excludeId?: number): Promise<boolean> {
    let query = supabase
      .from("cliente")
      .select("idcliente", { count: "exact" })
      .eq("dni", dni);

    if (excludeId) {
      query = query.neq("idcliente", excludeId);
    }

    const { count, error } = await query;

    if (error) {
      console.error("Error checking DNI:", error.message);
      return false;
    }

    return (count || 0) > 0;
  }

  /**
   * Elimina un cliente por ID
   */
  static async deleteCliente(id: number): Promise<void> {
    const { error } = await supabase.from("cliente").delete().eq("idcliente", id);

    if (error) {
      console.error("Error deleting cliente:", error);
      if (error.code === "23503") {
        throw new Error(
          "No se puede eliminar el cliente porque tiene registros asociados (solicitudes, cuotas, etc.).",
        );
      }
      throw new Error(`Error al eliminar cliente: ${error.message}`);
    }
  }
}
