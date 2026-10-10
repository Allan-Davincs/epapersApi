import { spawnSync } from 'node:child_process';
if(!process.env.TEST_DATABASE_URL || !new URL(process.env.TEST_DATABASE_URL).pathname.includes('test')) {console.error('Set TEST_DATABASE_URL to a disposable CockroachDB database with test in its name.');process.exit(1);}
const env={...process.env,DATABASE_URL:process.env.TEST_DATABASE_URL,NODE_ENV:'test'};
for(const args of [['--use-system-ca','node_modules/prisma/build/index.js','migrate','deploy'],['--conditions=react-server','--import','tsx','prisma/seed.ts'],['node_modules/vitest/vitest.mjs','run','tests/database.test.ts','tests/phases345.database.test.ts'],['--conditions=react-server','--import','tsx','scripts/explain-indexes.ts']]) {
 const result=spawnSync(process.execPath,args,{env,stdio:'inherit'});if(result.status!==0)process.exit(result.status || 1);
}
