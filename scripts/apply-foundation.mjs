import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
const db=new PrismaClient();
try {
 const tables=await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_catalog=current_database()`;
 if(tables.length) throw new Error('Target database is no longer empty; inspect existing migration history before continuing');
} catch(error) {console.error(error instanceof Error && error.message.startsWith('Target')?error.message:'Database preflight failed');process.exitCode=1;}
finally {await db.$disconnect();}
if(!process.exitCode) for(const args of [['--use-system-ca','node_modules/prisma/build/index.js','migrate','deploy'],['--conditions=react-server','--import','tsx','prisma/seed.ts']]) {const result=spawnSync(process.execPath,args,{env:process.env,stdio:'inherit'});if(result.status!==0){process.exitCode=result.status || 1;break;}}
