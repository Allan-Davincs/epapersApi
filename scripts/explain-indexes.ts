import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';
const db=new PrismaClient();
async function main() {
try {
 if(!process.env.TEST_DATABASE_URL || !new URL(process.env.DATABASE_URL!).pathname.includes('test')) throw new Error('Index verification requires an isolated test database');
 const program=await db.program.findFirstOrThrow();
 let owner=await db.user.findUnique({where:{usernameNormalized:'index_fixture'}});
 if(!owner) owner=await db.user.create({data:{username:'index_fixture',usernameNormalized:'index_fixture',email:'index_fixture@example.com',emailNormalized:'index_fixture@example.com',fullName:'Index Fixture',passwordHash:'disabled-no-login'}});
 await db.$executeRaw`INSERT INTO modules(id,program_id,code,code_normalized,name,name_normalized,semester,level_year,updated_at)
 SELECT gen_random_uuid(),${program.id}::UUID,'PLAN'||n,'plan'||n,'Plan Module '||n,'plan module '||n,1+(n%2),1,now() FROM generate_series(1,200) AS g(n)
 WHERE NOT EXISTS(SELECT 1 FROM modules WHERE code_normalized='plan'||n)`;
 await db.$executeRaw`INSERT INTO stored_files(id,owner_user_id,bucket_name,object_key,original_filename,content_type,size_bytes,scan_status)
 SELECT gen_random_uuid(),${owner.id}::UUID,'test-fixtures','plan/'||n,'fixture.pdf','application/pdf',1024,'CLEAN'
 FROM generate_series(1,3000) AS g(n) WHERE NOT EXISTS(SELECT 1 FROM stored_files WHERE object_key='plan/'||n)`;
 await db.$executeRaw`INSERT INTO papers(id,module_id,uploaded_by_user_id,title,category,academic_year_start,semester,exam_file_id,status,downloads_count,created_at,updated_at)
 SELECT gen_random_uuid(),m.id,${owner.id}::UUID,'Index Fixture '||f.object_key,'UE',2024,m.semester,f.id,'APPROVED',abs(fnv32(f.object_key))%1000,now()-INTERVAL '1 second' * (abs(fnv32(f.object_key))%86400),now()
 FROM stored_files f JOIN modules m ON m.code_normalized='plan'||(1+(abs(fnv32(f.object_key))%200))
 WHERE f.object_key LIKE 'plan/%' AND NOT EXISTS(SELECT 1 FROM papers WHERE exam_file_id=f.id)`;
 await db.$executeRaw`ANALYZE modules`;
 await db.$executeRaw`ANALYZE papers`;
 const plans={
 modules:await db.$queryRaw`EXPLAIN SELECT id FROM modules WHERE program_id=${program.id}::UUID AND semester=1 AND is_active AND deleted_at IS NULL`,
 recent:await db.$queryRaw`EXPLAIN SELECT id FROM papers WHERE status='APPROVED' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 25`,
 popular:await db.$queryRaw`EXPLAIN SELECT id FROM papers WHERE status='APPROVED' AND deleted_at IS NULL ORDER BY downloads_count DESC LIMIT 25`,
 search:await db.$queryRaw`EXPLAIN SELECT id FROM modules WHERE name_normalized >= 'plan module 1' AND name_normalized < 'plan module 1\uffff' AND deleted_at IS NULL`,
 auth:await db.$queryRaw`EXPLAIN SELECT id FROM users WHERE email_normalized='index_fixture@example.com' AND deleted_at IS NULL`
 };
 writeFileSync('docs/INDEXES.json',JSON.stringify({fixture:{modules:200,papers:3000},plans},null,2)+'\n');
 console.info('Index plans written to docs/INDEXES.json (200 modules, 3000 papers).');
} finally {await db.$disconnect();}

}
main().catch(error=>{console.error('Index verification failed:',error.code || error.name);process.exitCode=1;});
