// Audit log types
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  actor: {
    id: string;
    name: string;
    email: string;
  };
  action: string; // 'created' | 'updated' | 'deleted'
  resourceType: string;
  resourceId: string;
  resourceName: string;
  changes?: {
    field: string;
    before: unknown;
    after: unknown;
  }[];
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
  resourceType?: string;
  actorId?: string;
  action?: string;
  from?: Date;
  to?: Date;
}

export type AuditResourceType =
  | 'booking'
  | 'customer'
  | 'staff'
  | 'service'
  | 'workflow'
  | 'settings';
