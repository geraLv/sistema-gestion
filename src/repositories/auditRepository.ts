import { supabase } from "../db";
import { AuditLogCreate, AuditQuery } from "../types/audit";

export class AuditRepository {
  static async createLog(payload: AuditLogCreate): Promise<void> {
    const { error } = await supabase.from("audit_log").insert([
      {
        actor_user_id: payload.actor_user_id,
        actor_username: payload.actor_username,
        action: payload.action,
        entity: payload.entity,
        entity_id: payload.entity_id,
        before: payload.before,
        after: payload.after,
        ip: payload.ip || null,
        user_agent: payload.user_agent || null,
        request_id: payload.request_id || null,
      },
    ]);

    if (error) {
      console.error("Error creating audit log:", error.message);
      throw new Error(`Error al guardar auditoría: ${error.message}`);
    }
  }

  static async listLogs(query: AuditQuery): Promise<any[]> {
    let q = supabase.from("audit_log").select("*").order("created_at", {
      ascending: false,
    });

    if (query.entity) q = q.eq("entity", query.entity);
    if (query.entity_id) q = q.eq("entity_id", query.entity_id);
    if (query.action) q = q.eq("action", query.action);
    if (query.actor)
      q = q.ilike("actor_username", `%${query.actor}%`);
    if (query.date_from) q = q.gte("created_at", query.date_from);
    if (query.date_to) q = q.lte("created_at", query.date_to);
    if (query.q) q = q.or(`entity.ilike.%${query.q}%,actor_username.ilike.%${query.q}%`);

    if (query.limit) q = q.limit(query.limit);
    if (query.offset) q = q.range(query.offset, (query.offset || 0) + (query.limit || 50) - 1);

    const { data, error } = await q;
    if (error) {
      console.error("Error fetching audit logs:", error.message);
      throw new Error(`Error al obtener auditoría: ${error.message}`);
    }

    const logs = data || [];

    // Adjuntar nrosolicitud a los logs donde entity sea 'solicitud'
    const solicitudIds = logs
      .filter((l) => l.entity === "solicitud" && l.entity_id && !isNaN(Number(l.entity_id)))
      .map((l) => Number(l.entity_id));

    if (solicitudIds.length > 0) {
      const { data: solicitudes } = await supabase
        .from("solicitud")
        .select("idsolicitud, nrosolicitud")
        .in("idsolicitud", solicitudIds);

      if (solicitudes && solicitudes.length > 0) {
        const solMap = new Map();
        solicitudes.forEach((s) => solMap.set(String(s.idsolicitud), s.nrosolicitud));

        logs.forEach((l) => {
          if (l.entity === "solicitud" && solMap.has(l.entity_id)) {
            // Adjuntamos la propiedad en tiempo de respuesta a la API
            l.nrosolicitud = solMap.get(l.entity_id);
          }
        });
      }
    }

    return logs;
  }

  static async pruneOlderThan(days: number): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const { error } = await supabase
      .from("audit_log")
      .delete()
      .lt("created_at", cutoff.toISOString());
    if (error) {
      console.error("Error pruning audit logs:", error.message);
      throw new Error(`Error al limpiar auditoría: ${error.message}`);
    }
  }
}
