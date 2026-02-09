export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "PASSWORD_CHANGE"
  | "STATUS_CHANGE"
  | "ROLE_CHANGE";

export interface AuditLogCreate {
  actor_user_id: number | null;
  actor_username: string | null;
  action: AuditAction;
  entity: string;
  entity_id: string | number | null;
  before: any | null;
  after: any | null;
  ip?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
}

export interface AuditQuery {
  entity?: string;
  action?: string;
  actor?: string;
  date_from?: string;
  date_to?: string;
  q?: string;
  limit?: number;
  offset?: number;
}
