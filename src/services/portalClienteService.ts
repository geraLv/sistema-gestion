import jwt from "jsonwebtoken";
import { PortalClienteRepository } from "../repositories/portalClienteRepository";

const JWT_SECRET = process.env.JWT_SECRET || "";
const PORTAL_JWT_EXPIRES_IN = process.env.PORTAL_JWT_EXPIRES_IN || "10m";
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "";

interface PortalConsultaResult {
    success: boolean;
    error?: string;
    data?: {
        nombre: string;
        solicitudes: any[];
    };
    portalToken?: string;
}

interface PortalCuotasResult {
    success: boolean;
    error?: string;
    data?: any[];
}

export class PortalClienteService {
    /**
     * Valida formato de DNI (7-8 dígitos argentinos)
     */
    private static validateDni(dni: string): { valid: boolean; error?: string } {
        if (!dni || dni.trim().length === 0) {
            return { valid: false, error: "DNI es requerido" };
        }

        const cleanDni = dni.replace(/[\s.\-]/g, "");
        if (!/^\d{7,8}$/.test(cleanDni)) {
            return { valid: false, error: "Formato de DNI inválido" };
        }

        return { valid: true };
    }

    /**
     * Ofusca el nombre del cliente.
     * Ej: "JUAN CARLOS PEREZ" → "J*** C***** P****"
     */
    private static ofuscarNombre(nombre: string): string {
        return nombre
            .split(" ")
            .map((word) => {
                if (word.length <= 1) return word;
                return word[0] + "•".repeat(word.length - 1);
            })
            .join(" ");
    }

    /**
     * Valida el token reCAPTCHA con Google
     */
    static async validateCaptcha(token: string): Promise<boolean> {
        if (!RECAPTCHA_SECRET_KEY) {
            // If no key configured, skip captcha validation (dev mode)
            console.warn(
                "Portal: RECAPTCHA_SECRET_KEY not set, skipping CAPTCHA validation",
            );
            return true;
        }

        try {
            const response = await fetch(
                "https://www.google.com/recaptcha/api/siteverify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: `secret=${encodeURIComponent(RECAPTCHA_SECRET_KEY)}&response=${encodeURIComponent(token)}`,
                },
            );

            const result = await response.json();
            return result.success === true;
        } catch (error) {
            console.error("Portal: CAPTCHA validation error:", error);
            return false;
        }
    }

    /**
     * Genera un token temporal para el portal (scope limitado: solo idcliente)
     */
    private static generatePortalToken(idcliente: number): string {
        return jwt.sign(
            { idcliente, scope: "portal" },
            JWT_SECRET,
            { expiresIn: PORTAL_JWT_EXPIRES_IN } as jwt.SignOptions,
        );
    }

    /**
     * Valida un token temporal del portal
     */
    static validatePortalToken(
        token: string,
    ): { valid: boolean; idcliente?: number } {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            if (decoded.scope !== "portal" || !decoded.idcliente) {
                return { valid: false };
            }
            return { valid: true, idcliente: decoded.idcliente };
        } catch {
            return { valid: false };
        }
    }

    /**
     * Consulta principal: busca cliente por DNI y retorna datos resumidos
     */
    static async consultar(
        dni: string,
        captchaToken: string,
    ): Promise<PortalConsultaResult> {
        // 1. Validar DNI
        const dniValidation = this.validateDni(dni);
        if (!dniValidation.valid) {
            return { success: false, error: dniValidation.error };
        }

        // 2. Validar CAPTCHA
        const captchaValid = await this.validateCaptcha(captchaToken);
        if (!captchaValid) {
            return { success: false, error: "Verificación CAPTCHA fallida" };
        }

        // 3. Buscar cliente
        const cliente = await PortalClienteRepository.getClienteByDni(dni);
        if (!cliente) {
            // Generic error to avoid DNI enumeration
            return { success: false, error: "No se encontraron datos para el DNI ingresado" };
        }

        // 4. Obtener solicitudes
        const solicitudes =
            await PortalClienteRepository.getSolicitudesByClienteId(
                cliente.idcliente,
            );

        // 5. Generar token temporal
        const portalToken = this.generatePortalToken(cliente.idcliente);

        return {
            success: true,
            data: {
                nombre: this.ofuscarNombre(cliente.appynom),
                solicitudes,
            },
            portalToken,
        };
    }

    /**
     * Obtiene las cuotas de una solicitud (requiere portal token)
     */
    static async obtenerCuotas(
        idsolicitud: number,
        portalToken: string,
    ): Promise<PortalCuotasResult> {
        // Validate portal token
        const tokenResult = this.validatePortalToken(portalToken);
        if (!tokenResult.valid || !tokenResult.idcliente) {
            return { success: false, error: "Token de sesión inválido o expirado" };
        }

        try {
            const cuotas = await PortalClienteRepository.getCuotasBySolicitudId(
                idsolicitud,
                tokenResult.idcliente,
            );

            return { success: true, data: cuotas };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || "Error al obtener cuotas",
            };
        }
    }
}
