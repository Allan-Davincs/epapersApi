import { spawnSync } from 'node:child_process';
const task=process.argv[2];
if(!['load-test','restore-drill'].includes(task)||!process.env.TEST_DATABASE_URL||!new URL(process.env.TEST_DATABASE_URL).pathname.includes('test')){
 console.error('Provide TEST_DATABASE_URL naming a disposable test database and a supported check.');process.exit(1);
}
const result=spawnSync(process.execPath,['--conditions=react-server','--import','tsx',`scripts/${task}.ts`],{env:{...process.env,DATABASE_URL:process.env.TEST_DATABASE_URL,NODE_ENV:'test'},stdio:'inherit'});
process.exit(result.status||0);
