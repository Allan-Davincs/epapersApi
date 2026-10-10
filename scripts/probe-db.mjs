import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
try { const rows = await db.$queryRaw`SELECT version() AS version`; console.log(rows[0].version); }
catch { console.error('Database connectivity probe failed (credentials omitted).'); process.exitCode = 1; }
finally { await db.$disconnect(); }
