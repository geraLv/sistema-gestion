import { randomUUID } from "crypto";
import { AuditRepository } from "../repositories/auditRepository";
import { AuditAction } from "../types/audit";

export class AuditService {
  static async log(params: {
    actor?: { iduser?: number; usuario?: string };
    action: AuditAction;
    entity: string;
    entityId?: string | number | null;
    before?: any | null;
    after?: any | null;
    ip?: string | null;
    userAgent?: string | null;
    requestId?: string | null;
  }): Promise<void> {
    const requestId = params.requestId || randomUUID();
    await AuditRepository.createLog({
      actor_user_id: params.actor?.iduser ?? null,
      actor_username: params.actor?.usuario ?? null,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId ?? null,
      before: params.before ?? null,
      after: params.after ?? null,
      ip: params.ip ?? null,
      user_agent: params.userAgent ?? null,
      request_id: requestId,
    });
  }
}
