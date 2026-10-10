import { PrismaClient } from '@prisma/client';
import { readFileSync,writeFileSync } from 'node:fs';
const db=new PrismaClient();
try {
 const name='epapers_phase12_test_'+Date.now();
 if(!/^epapers_phase12_test_[0-9]+$/.test(name)) throw new Error('Invalid test database name');
 // SQL identifiers cannot be bound. Name is server-generated and strictly validated above.
 await db.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
 const url=new URL(process.env.DATABASE_URL);url.pathname='/'+name;
 const config=readFileSync('.env','utf8').split('\n').filter(line=>!line.startsWith('TEST_DATABASE_URL=')).join('\n');
 writeFileSync('.env',config+'\nTEST_DATABASE_URL='+url.toString()+'\n');
 console.log('Isolated CockroachDB test database created; TEST_DATABASE_URL saved locally.');
} catch(error) { console.error('Test database creation failed:',error.code || error.name);process.exitCode=1; }
finally { await db.$disconnect(); }
