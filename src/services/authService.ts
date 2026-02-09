import * as jwt from "jsonwebtoken";
import { AuthRepository } from "../repositories/authRepository";
import {
  LoginDTO,
  ChangePasswordDTO,
  AuthResponse,
  UserPayload,
  ValidateTokenResponse,
} from "../types/auth";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "tu-clave-secreta-super-segura-cambiar-en-produccion";
const JWT_EXPIRES_IN = "24h";

export class AuthService {
  /**
   * Login - Valida credenciales y retorna JWT token
   */
  static async login(dto: LoginDTO): Promise<AuthResponse> {
    console.log(dto);
    try {
      // Validaciones
      if (!dto.usuario || dto.usuario.trim().length === 0) {
        return {
          success: false,
          error: "Usuario es requerido",
        };
      }

      if (!dto.password || dto.password.length === 0) {
        return {
          success: false,
          error: "Contraseña es requerida",
        };
      }

      // Buscar usuario
      const user = await AuthRepository.getUserByUsername(dto.usuario.trim());
      if (!user) {
        return {
          success: false,
          error: "Usuario o contraseña inválidos",
        };
      }

      // Verificar que el usuario está activo
      const active = (user.status ?? user.estado) === 1;
      if (!active) {
        return {
          success: false,
          error: "Usuario inactivo. Contacte al administrador",
        };
      }

      // Verificar contraseña
      const passwordValid = await AuthRepository.verifyPassword(
        user.password,
        dto.password,
      );
      if (!passwordValid) {
        return {
          success: false,
          error: "Usuario o contraseña inválidos",
        };
      }

      // Generar JWT token
      const payload: UserPayload = {
        iduser: user.iduser!,
        usuario: user.usuario,
        nombre: user.nombre,
        role: user.role || "user",
        status: user.status ?? user.estado,
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      });

      console.log("paso");
      return {
        success: true,
        token,
        user: payload,
        userData: payload,
        message: "Login exitoso",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Error en el login",
      };
    }
  }

  /**
   * Valida un token JWT
   */
  static async validateToken(token: string): Promise<ValidateTokenResponse> {
    try {
      if (!token) {
        return {
          success: false,
          valid: false,
          error: "Token requerido",
        };
      }

      // Remover "Bearer " si existe
      const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;

      // Verificar y decodificar token
      const decoded = jwt.verify(cleanToken, JWT_SECRET) as UserPayload;

      return {
        success: true,
        valid: true,
        user: decoded,
      };
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        return {
          success: false,
          valid: false,
          error: "Token expirado",
        };
      }

      if (error.name === "JsonWebTokenError") {
        return {
          success: false,
          valid: false,
          error: "Token inválido",
        };
      }

      return {
        success: false,
        valid: false,
        error: error.message || "Error al validar token",
      };
    }
  }

  /**
   * Cambiar contraseña
   */
  static async changePassword(dto: ChangePasswordDTO): Promise<AuthResponse> {
    try {
      // Validaciones
      if (!dto.usuario || dto.usuario.trim().length === 0) {
        return {
          success: false,
          error: "Usuario es requerido",
        };
      }

      if (!dto.passwordActual || dto.passwordActual.length === 0) {
        return {
          success: false,
          error: "Contraseña actual es requerida",
        };
      }

      if (!dto.passwordNueva || dto.passwordNueva.length === 0) {
        return {
          success: false,
          error: "Nueva contraseña es requerida",
        };
      }

      if (dto.passwordNueva.length < 6) {
        return {
          success: false,
          error: "La nueva contraseña debe tener al menos 6 caracteres",
        };
      }

      if (dto.passwordActual === dto.passwordNueva) {
        return {
          success: false,
          error: "La nueva contraseña debe ser diferente a la actual",
        };
      }

      // Buscar usuario
      const user = await AuthRepository.getUserByUsername(dto.usuario.trim());
      if (!user) {
        return {
          success: false,
          error: "Usuario no encontrado",
        };
      }

      // Verificar contraseña actual
      const passwordValid = await AuthRepository.verifyPassword(
        user.password,
        dto.passwordActual,
      );
      if (!passwordValid) {
        return {
          success: false,
          error: "Contraseña actual inválida",
        };
      }

      // Actualizar contraseña
      await AuthRepository.updatePassword(user.iduser!, dto.passwordNueva);

      return {
        success: true,
        message: "Contraseña actualizada correctamente",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Error al cambiar contraseña",
      };
    }
  }

  /**
   * Obtiene información del usuario actual desde el token
   */
  static async getCurrentUser(token: string): Promise<AuthResponse> {
    const validation = await this.validateToken(token);

    if (!validation.success || !validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Obtener datos actualizados del usuario
    const user = await AuthRepository.getUserById(validation.user!.iduser);
    if (!user) {
      return {
        success: false,
        error: "Usuario no encontrado",
      };
    }

    return {
      success: true,
      user: {
        iduser: user.iduser!,
        usuario: user.usuario,
        nombre: user.nombre,
        role: user.role || "user",
        status: user.status ?? user.estado,
      },
    };
  }

  /**
   * Decodifica el payload de un token sin validar firma (para debug)
   */
  static decodeToken(token: string): UserPayload | null {
    try {
      const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
      const decoded = jwt.decode(cleanToken) as UserPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }
}
