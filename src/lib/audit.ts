import type { AuditAction, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type AuditWriter = Pick<typeof db, "auditLog">;

export type WriteAuditLogInput = {
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function writeAuditLog(
  { actorId = null, action, entityType, entityId = null, metadata }: WriteAuditLogInput,
  client: AuditWriter = db
) {
  return client.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      metadata
    }
  });
}
