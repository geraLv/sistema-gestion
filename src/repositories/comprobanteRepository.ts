import { supabase } from "../db";
import {
  CreateCuotaComprobanteDTO,
  CuotaComprobante,
} from "../types/comprobante";

export class ComprobanteRepository {
  static async create(
    dto: CreateCuotaComprobanteDTO,
  ): Promise<CuotaComprobante> {
    const { data, error } = await supabase
      .from("cuota_comprobante")
      .insert([
        {
          idcuota: dto.idcuota,
          archivo_path: dto.archivo_path,
          archivo_url: dto.archivo_url,
          archivo_nombre: dto.archivo_nombre ?? null,
          archivo_tipo: dto.archivo_tipo ?? null,
          archivo_size: dto.archivo_size ?? null,
          created_by: dto.created_by ?? null,
          observacion: dto.observacion ?? null,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Error al guardar comprobante: ${error.message}`);
    }

    return data as CuotaComprobante;
  }

  static async listByCuota(idcuota: number): Promise<CuotaComprobante[]> {
    const { data, error } = await supabase
      .from("cuota_comprobante")
      .select("*")
      .eq("idcuota", idcuota)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Error al obtener comprobantes: ${error.message}`);
    }
    console.log("comprobantes:", data);
    return (data as CuotaComprobante[]) || [];
  }
}
