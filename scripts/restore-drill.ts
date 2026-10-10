import { PrismaClient } from '@prisma/client';
import { randomUUID,createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { withRetry } from '../src/lib/retry';
if(!process.env.TEST_DATABASE_URL||process.env.DATABASE_URL!==process.env.TEST_DATABASE_URL||!new URL(process.env.DATABASE_URL!).pathname.includes('test'))throw new Error('Use the disposable test database launcher');
const db=new PrismaClient(),prefix='drill_'+randomUUID().replaceAll('-','').slice(0,10);
let id:string|undefined;
async function main(){const started=Date.now();try{
 // Synthetic, non-personal curriculum snapshot; never export credentials or accounts.
 const snapshot={department:{code:prefix,name:'Restore drill'},program:{code:prefix+'p',name:'Restore drill program',awardTitle:'Bachelor degree'},module:{code:prefix+'m',name:'Restored curriculum',semester:1,levelYear:2,credits:4}};
 const serialized=JSON.stringify(snapshot),checksum=createHash('sha256').update(serialized).digest('hex'),parsed=JSON.parse(serialized) as typeof snapshot;
 const restored=await withRetry(()=>db.$transaction(async tx=>{
  const d=await tx.department.create({data:{...parsed.department,codeNormalized:parsed.department.code}});id=d.id;
  const p=await tx.program.create({data:{...parsed.program,codeNormalized:parsed.program.code,departmentId:d.id,level:'BACHELOR',campus:'MAIN'}});
  const m=await tx.module.create({data:{...parsed.module,codeNormalized:parsed.module.code,nameNormalized:parsed.module.name.toLowerCase(),programId:p.id}});
  return {department:{code:d.code,name:d.name},program:{code:p.code,name:p.name,awardTitle:p.awardTitle},module:{code:m.code,name:m.name,semester:m.semester,levelYear:m.levelYear,credits:Number(m.credits)}};
 },{isolationLevel:'Serializable',timeout:20000}));
 if(createHash('sha256').update(JSON.stringify(restored)).digest('hex')!==checksum)throw new Error('Restore mismatch');
 const report={timestamp:new Date().toISOString(),scope:'Synthetic logical curriculum serialization and relational insert round-trip only; not a native backup or disaster recovery test.',verified:true,elapsedMs:Date.now()-started,checksum,rows:3};
 writeFileSync('docs/RESTORE-DRILL.json',JSON.stringify(report,null,2)+'\n');console.info(JSON.stringify(report,null,2));
 }finally{if(id)await withRetry(()=>db.$transaction(async tx=>{const p=await tx.program.findMany({where:{departmentId:id}});await tx.module.deleteMany({where:{programId:{in:p.map(v=>v.id)}}});await tx.program.deleteMany({where:{departmentId:id}});await tx.department.deleteMany({where:{id}});},{isolationLevel:'Serializable',timeout:20000}));await db.$disconnect();}}
main().catch(()=>{console.error('Restore drill failed; connection details omitted.');process.exitCode=1;});
