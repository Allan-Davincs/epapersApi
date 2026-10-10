import {PrismaClient} from '@prisma/client';
const db=new PrismaClient();
try {await db.$executeRaw`DROP DATABASE IF EXISTS "epapers_phase12_test_1791638804200" CASCADE`;console.info('Removed the failed temporary test database created during this task.');}
catch(error){console.error('Temporary database cleanup failed:',error.code || error.name);process.exitCode=1;}
finally {await db.$disconnect();}
