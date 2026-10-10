import { spawnSync } from 'node:child_process';
const task=process.argv[2];
if(!['load-test','restore-drill','explain-indexes','admin-tests'].includes(task)||!process.env.TEST_DATABASE_URL||!new URL(process.env.TEST_DATABASE_URL).pathname.includes('test')){
 console.error('Provide TEST_DATABASE_URL naming a disposable test database and a supported check.');process.exit(1);
}
const commands=[...(task==='explain-indexes'?[['--use-system-ca','node_modules/prisma/build/index.js','migrate','deploy']]:[]),task==='admin-tests'?['node_modules/vitest/vitest.mjs','run','tests/phases678.database.test.ts']:['--conditions=react-server','--import','tsx',`scripts/${task}.ts`]];
for(const args of commands){const result=spawnSync(process.execPath,args,{env:{...process.env,DATABASE_URL:process.env.TEST_DATABASE_URL,NODE_ENV:'test'},stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);}
