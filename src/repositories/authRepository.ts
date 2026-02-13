import { supabase } from "../db";
import { User } from "../types/auth";
import * as bcrypt from "bcryptjs";

interface UserPublic {
  iduser: number;
  usuario: string;
  nombre?: string;
  email?: string;
  estado?: number;
  status?: number;
  role?: string;
  fechacreacion?: string;
}

export class AuthRepository {
  /**
   * Obtiene un usuario por nombre de usuario
   */
  static async getUserByUsername(usuario: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("app_user")
      .select("*")
      .eq("usuario", usuario)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching user:", error.message);
      throw new Error(`Error al obtener usuario: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Obtiene un usuario por ID
   */
  static async getUserById(iduser: number): Promise<User | null> {
    const { data, error } = await supabase
      .from("app_user")
      .select("*")
      .eq("iduser", iduser)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching user by id:", error.message);
      throw new Error(`Error al obtener usuario: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Obtiene todos los usuarios (para administración)
   */
  static async getAllUsers(): Promise<UserPublic[]> {
    const { data, error } = await supabase
      .from("app_user")
      .select("iduser, usuario, nombre, email, status, role, fechacreacion")
      .order("iduser", { ascending: true });

    if (error) {
      console.error("Error fetching users:", error.message);
      throw new Error(`Error al obtener usuarios: ${error.message}`);
    }
    return (data as UserPublic[]) || [];
  }

  /**
   * Crea un nuevo usuario
   */
  static async createUser(
    usuario: string,
    password: string,
    nombre?: string,
    email?: string,
    role: string = "user",
    status: number = 1,
  ): Promise<User> {
    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("app_user")
      .insert([
        {
          usuario,
          password: passwordHash,
          nombre: nombre || "",
          email: email || "",
          estado: status, // compat
          status: status,
          role,
          fechacreacion: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating user:", error.message);
      throw new Error(`Error al crear usuario: ${error.message}`);
    }

    return data;
  }

  /**
   * Actualiza la contraseña de un usuario
   */
  static async updatePassword(
    iduser: number,
    newPassword: string,
  ): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from("app_user")
      .update({ password: passwordHash })
      .eq("iduser", iduser);

    if (error) {
      console.error("Error updating password:", error.message);
      throw new Error(`Error al actualizar contraseña: ${error.message}`);
    }
  }

  /**
   * Verifica si una contraseña coincide con el hash almacenado
   */
  static async verifyPassword(
    storedHash: string,
    providedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(providedPassword, storedHash);
  }

  /**
   * Desactiva un usuario (para auditoría)
   */
  static async deactivateUser(iduser: number): Promise<void> {
    const { error } = await supabase
      .from("app_user")
      .update({ status: 0 })
      .eq("iduser", iduser);

    if (error) {
      throw new Error(`Error al desactivar usuario: ${error.message}`);
    }
  }

  static async updateUser(
    iduser: number,
    data: { usuario?: string; nombre?: string; email?: string },
  ): Promise<User | null> {
    const { data: updated, error } = await supabase
      .from("app_user")
      .update({
        ...(data.usuario !== undefined ? { usuario: data.usuario } : {}),
        ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
      })
      .eq("iduser", iduser)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al actualizar usuario: ${error.message}`);
    }

    return updated || null;
  }

  static async updateRefreshToken(
    iduser: number,
    refreshTokenHash: string | null,
    refreshTokenExpires: string | null,
  ): Promise<void> {
    const { error } = await supabase
      .from("app_user")
      .update({
        refresh_token_hash: refreshTokenHash,
        refresh_token_expires: refreshTokenExpires,
      })
      .eq("iduser", iduser);

    if (error) {
      throw new Error(`Error al actualizar refresh token: ${error.message}`);
    }
  }

  static async setUserStatus(iduser: number, status: number): Promise<void> {
    const { error } = await supabase
      .from("app_user")
      .update({ status: status })
      .eq("iduser", iduser);

    if (error) {
      throw new Error(`Error al actualizar estado: ${error.message}`);
    }
  }

  static async setUserRole(iduser: number, role: string): Promise<void> {
    const { error } = await supabase
      .from("app_user")
      .update({ role })
      .eq("iduser", iduser);

    if (error) {
      throw new Error(`Error al actualizar rol: ${error.message}`);
    }
  }
}
