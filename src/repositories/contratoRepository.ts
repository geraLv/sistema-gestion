import { supabase } from "../db";
import { Contrato, CreateContratoDTO } from "../types/contrato";

export class ContratoRepository {
    /**
     * Crea un nuevo contrato (estado 1: Pendiente)
     */
    static async createContrato(dto: CreateContratoDTO): Promise<Contrato> {
        const { data, error } = await supabase
            .from("contratos")
            .insert([
                {
                    relasolicitud: dto.relasolicitud,
                    token_acceso: dto.token_acceso,
                    url_pdf_original: dto.url_pdf_original,
                    estado: 1, // Pendiente
                },
            ])
            .select()
            .single();

        if (error) {
            console.error("Error creating contrato:", error.message);
            throw new Error(`Error al crear contrato: ${error.message}`);
        }

        return data;
    }

    /**
     * Obtiene un contrato por su token de acceso público
     */
    static async getContratoByToken(token: string): Promise<Contrato | null> {
        const { data, error } = await supabase
            .from("contratos")
            .select("*")
            .eq("token_acceso", token)
            .single();

        if (error && error.code !== "PGRST116") {
            console.error("Error fetching contrato by token:", error.message);
            throw new Error(`Error al obtener contrato: ${error.message}`);
        }

        return data || null;
    }

    /**
     * Obtiene un contrato por el ID de solicitud
     */
    static async getContratoBySolicitud(
        idsolicitud: number,
    ): Promise<Contrato | null> {
        const { data, error } = await supabase
            .from("contratos")
            .select("*")
            .eq("relasolicitud", idsolicitud)
            .order("fecha_generacion", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error && error.code !== "PGRST116") {
            console.error("Error fetching contrato by solicitud:", error.message);
            throw new Error(`Error al obtener contrato: ${error.message}`);
        }

        return data || null;
    }

    /**
     * Actualiza el contrato una vez firmado
     */
    static async markAsSigned(
        idcontrato: string,
        urlPdfFirmado: string,
        ipCliente: string,
    ): Promise<Contrato> {
        const { data, error } = await supabase
            .from("contratos")
            .update({
                estado: 2, // Firmado
                url_pdf_firmado: urlPdfFirmado,
                fecha_firma: new Date().toISOString(),
                ip_cliente_firma: ipCliente,
            })
            .eq("idcontrato", idcontrato)
            .select()
            .single();

        if (error) {
            console.error("Error updating contrato sign:", error.message);
            throw new Error(`Error al actualizar estado del contrato: ${error.message}`);
        }

        return data;
    }

    /**
     * Actualiza el contrato pendiente cuando se re-genera
     */
    static async updateContratoPendiente(
        idcontrato: string,
        urlPdfOriginal: string,
        tokenAcceso: string,
    ): Promise<Contrato> {
        const { data, error } = await supabase
            .from("contratos")
            .update({
                url_pdf_original: urlPdfOriginal,
                token_acceso: tokenAcceso,
                fecha_generacion: new Date().toISOString()
            })
            .eq("idcontrato", idcontrato)
            .select()
            .single();

        if (error) {
            console.error("Error updating pending contrato:", error.message);
            throw new Error(`Error al actualizar contrato pendiente: ${error.message}`);
        }

        return data;
    }
}
