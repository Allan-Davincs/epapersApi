import { PrismaClient } from '@prisma/client';
const db=new PrismaClient();
try {
 const modules=await db.$queryRaw`EXPLAIN SELECT id FROM modules WHERE program_id=gen_random_uuid() AND semester=1 AND is_active AND deleted_at IS NULL`;
 const recent=await db.$queryRaw`EXPLAIN SELECT id FROM papers WHERE status='APPROVED' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 25`;
 const popular=await db.$queryRaw`EXPLAIN SELECT id FROM papers WHERE status='APPROVED' AND deleted_at IS NULL ORDER BY downloads_count DESC LIMIT 25`;
 console.info(JSON.stringify({modules,recent,popular}));
} finally {await db.$disconnect();}
