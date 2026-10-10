import { PrismaClient, ProgramLevel, Campus } from '@prisma/client';
import { withRetry } from '../src/lib/retry';
import seed from './seed/curriculum-v1.json';
const db=new PrismaClient();
async function main() {
 await withRetry(()=>db.$transaction(async tx=> {
  for(const d of seed.departments) {
   let department=await tx.department.findFirst({where:{codeNormalized:d.code.toLowerCase(),deletedAt:null}});
   if(!department) department=await tx.department.create({data:{code:d.code,codeNormalized:d.code.toLowerCase(),name:d.name}});
   for(const p of seed.programs.filter(p=>p.departmentCode===d.code)) {
    const existing=await tx.program.findFirst({where:{departmentId:department.id,codeNormalized:p.code.toLowerCase(),deletedAt:null}});
    if(!existing) await tx.program.create({data:{departmentId:department.id,code:p.code,codeNormalized:p.code.toLowerCase(),name:p.name,level:p.level as ProgramLevel,awardTitle:p.awardTitle,campus:p.campus as Campus}});
   }
  }
 }));
 console.info('DIT curriculum v1 seeded; verify flagged assignments before production. No users or modules seeded.');
}
main().catch(()=>{console.error('Seed failed');process.exitCode=1;}).finally(()=>db.$disconnect());
