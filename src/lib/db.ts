import 'server-only';
import { Prisma, PrismaClient } from '@prisma/client';
import { withRetry } from './retry';
export { withRetry } from './retry';
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
const raw = globalDb.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalDb.prisma = raw;
const softModels = new Set(['User', 'Department', 'Program', 'Module', 'Paper', 'Announcement', 'ModuleRequest']);
export const db = raw.$extends({ query: { $allModels: { async $allOperations({ model, operation, args, query }) {
  if (softModels.has(model) && ['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy', 'update', 'updateMany'].includes(operation)) {
    const a = args as { where?: Record<string, unknown> };
    const original = a.where ?? {};
    a.where = ['findUnique', 'findUniqueOrThrow', 'update'].includes(operation)
      ? { ...original, deletedAt: null }
      : { AND: [original, { deletedAt: null }] };
  }
  return query(args);
} } } });
/** Restricted escape hatch for admin restore/purge only. */
export function withDeleted() { return raw; }
export async function withTransactionRetry<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return withRetry(() => raw.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}
