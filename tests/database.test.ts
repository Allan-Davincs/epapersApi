import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
describe.skipIf(!process.env.TEST_DATABASE_URL)('real CockroachDB migrations', () => {
 it('uses CockroachDB and enforces positive XP', async () => { const db=new PrismaClient(); try { const version=await db.$queryRaw<Array<{version:string}>>`SELECT version()`; expect(version[0].version).toContain('CockroachDB'); await expect(db.$executeRaw`INSERT INTO xp_ledger(user_id,amount,event_type) VALUES (gen_random_uuid(),-1,'ADMIN_ADJUSTMENT')`).rejects.toThrow(); } finally { await db.$disconnect(); } });
});
