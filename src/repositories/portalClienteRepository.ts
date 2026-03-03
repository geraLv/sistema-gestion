import { supabase } from "../db";

/**
 * Repository para el Portal de Consulta de Clientes.
 * Solo expone datos seguros (sin dirección, teléfono, email, observaciones).
 */
export class PortalClienteRepository {
    /**
     * Busca un cliente por DNI exacto.
     * Retorna solo idcliente y appynom (el service ofuscará el nombre).
     */
    static async getClienteByDni(
        dni: string,
    ): Promise<{ idcliente: number; appynom: string } | null> {
        // Normalize: remove dots, spaces, dashes
        const cleanDni = dni.replace(/[\s.\-]/g, "");

        // Try exact match first, then formatted variations
        const variations = [cleanDni];
        if (cleanDni.length === 7) {
            variations.push(cleanDni.replace(/(\d{1})(\d{3})(\d{3})/, "$1.$2.$3"));
        } else if (cleanDni.length === 8) {
            variations.push(cleanDni.replace(/(\d{2})(\d{3})(\d{3})/, "$1.$2.$3"));
        }

        const filters = variations.map((v) => `dni.eq.${v}`);

        const { data, error } = await supabase
            .from("cliente")
            .select("idcliente, appynom")
            .or(filters.join(","))
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error("Portal: Error fetching cliente by DNI:", error.message);
            throw new Error("Error al buscar cliente");
        }

        return data || null;
    }

    /**
     * Obtiene las solicitudes de un cliente (solo datos seguros).
     * NO incluye: vendedor, usuario, observaciones.
     */
    static async getSolicitudesByClienteId(idcliente: number): Promise<any[]> {
        const { data, error } = await supabase
            .from("solicitud")
            .select(
                `
        idsolicitud,
        nrosolicitud,
        monto,
        totalapagar,
        cantidadcuotas,
        totalabonado,
        porcentajepagado,
        estado,
        fechalta,
        producto:relaproducto (
          descripcion
        )
      `,
            )
            .eq("relacliente", idcliente)
            .in("estado", [1, 2]) // Solo activas y pagadas, no bajas
            .order("fechalta", { ascending: false });

        if (error) {
            console.error(
                "Portal: Error fetching solicitudes:",
                error.message,
            );
            throw new Error("Error al obtener solicitudes");
        }

        return (data || []).map((s: any) => ({
            idsolicitud: s.idsolicitud,
            nrosolicitud: s.nrosolicitud,
            producto: s.producto?.descripcion || "—",
            monto: s.monto,
            totalapagar: s.totalapagar,
            cantidadcuotas: s.cantidadcuotas,
            totalabonado: s.totalabonado,
            porcentajepagado: s.porcentajepagado,
            estado: s.estado, // 1=activa, 2=pagada
            fechalta: s.fechalta,
        }));
    }

    /**
     * Obtiene las cuotas de una solicitud (solo datos seguros).
     * Verifica que la solicitud pertenezca al cliente indicado.
     */
    static async getCuotasBySolicitudId(
        idsolicitud: number,
        idcliente: number,
    ): Promise<any[]> {
        // First verify ownership
        const { data: sol, error: solErr } = await supabase
            .from("solicitud")
            .select("idsolicitud")
            .eq("idsolicitud", idsolicitud)
            .eq("relacliente", idcliente)
            .maybeSingle();

        if (solErr || !sol) {
            throw new Error("Solicitud no encontrada");
        }

        const { data, error } = await supabase
            .from("cuotas")
            .select("nrocuota, importe, fecha, vencimiento, estado")
            .eq("relasolicitud", idsolicitud)
            .order("nrocuota", { ascending: true });

        if (error) {
            console.error("Portal: Error fetching cuotas:", error.message);
            throw new Error("Error al obtener cuotas");
        }

        return (data || []).map((c: any) => ({
            nrocuota: c.nrocuota,
            importe: c.importe,
            fechaPago: c.fecha || null,
            vencimiento: c.vencimiento,
            estado: c.estado, // 0=impaga, 2=pagada
        }));
    }
}
