import { PrismaClient } from '@prisma/client';
const db=new PrismaClient();
try { const rows=await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_catalog=current_database() ORDER BY table_name`;console.log(JSON.stringify(rows)); }
catch {console.error('Schema inspection failed');process.exitCode=1;}
finally {await db.$disconnect();}
