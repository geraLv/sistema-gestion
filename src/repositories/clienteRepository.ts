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
  static async getAllClientes(): Promise<ClienteWithLocalidad[]> {
    const { data, error } = await supabase
      .from("cliente")
      .select(
        `
        idcliente,
        appynom,
        dni,
        direccion,
        telefono,
        relalocalidad,
        condicion,
        fechalta,
        localidad(nombre) 
      `,
      )
      .order("appynom", { ascending: true });

    if (error) {
      console.error("Error fetching clientes:", error.message);
      throw new Error(`Error al obtener clientes: ${error.message}`);
    }

    return data || [];
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
        relalocalidad,
        condicion,
        fechalta,
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
    // Workaround for out-of-sync primary key sequence:
    // compute next idcliente manually to avoid duplicate key errors.
    let nextId = 1;
    const { data: last, error: lastError } = await supabase
      .from("cliente")
      .select("idcliente")
      .order("idcliente", { ascending: false })
      .limit(1);

    if (lastError) {
      console.error("Error fetching last cliente id:", lastError.message);
      throw new Error(`Error al obtener último cliente: ${lastError.message}`);
    }

    if (last && last.length > 0 && Number.isInteger(last[0].idcliente)) {
      nextId = (last[0].idcliente as number) + 1;
    }

    const { data, error } = await supabase
      .from("cliente")
      .insert([
        {
          idcliente: nextId,
          appynom: dto.appynom,
          dni: dto.dni,
          direccion: dto.direccion,
          telefono: dto.telefono,
          relalocalidad: dto.selectLocalidades,
          condicion: 1, // activo por defecto
          fechalta: new Date().toISOString(),
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
        relalocalidad: dto.selectLocalidades,
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
   * Busca clientes por nombre (ilike para búsqueda insensible a mayúsculas)
   */
  static async searchClientes(query: string): Promise<ClienteWithLocalidad[]> {
    const { data, error } = await supabase
      .from("cliente")
      .select(
        `
        idcliente,
        appynom,
        dni,
        direccion,
        telefono,
        relalocalidad,
        condicion,
        fechalta,
        localidad(nombre)
      `,
      )
      .ilike("appynom", `%${query}%`)
      .order("appynom", { ascending: true })
      .limit(50);

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
}
