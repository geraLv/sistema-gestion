import { randomUUID } from "crypto";
import { AuditRepository } from "../repositories/auditRepository";
import { AuditAction } from "../types/audit";

export class AuditService {
  private static lastPruneAt: number | null = null;

  private static sanitize(value: any): any {
    if (value === null || value === undefined) return value;
    if (typeof value !== "object") return value;
    const cloned = Array.isArray(value) ? [] : {};
    for (const [key, val] of Object.entries(value)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("password") ||
        lower.includes("token") ||
        lower.includes("refresh") ||
        lower.includes("secret")
      ) {
        (cloned as any)[key] = "[redacted]";
        continue;
      }
      (cloned as any)[key] = this.sanitize(val);
    }
    return cloned;
  }

  private static async maybePrune(): Promise<void> {
    const days = Number(process.env.AUDIT_RETENTION_DAYS || 90);
    if (!Number.isFinite(days) || days <= 0) return;
    const now = Date.now();
    if (this.lastPruneAt && now - this.lastPruneAt < 24 * 60 * 60 * 1000) {
      return;
    }
    this.lastPruneAt = now;
    await AuditRepository.pruneOlderThan(days);
  }

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
    await this.maybePrune();
    await AuditRepository.createLog({
      actor_user_id: params.actor?.iduser ?? null,
      actor_username: params.actor?.usuario ?? null,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId ?? null,
      before: this.sanitize(params.before ?? null),
      after: this.sanitize(params.after ?? null),
      ip: params.ip ?? null,
      user_agent: params.userAgent ?? null,
      request_id: requestId,
    });
  }
}
