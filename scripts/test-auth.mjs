import {spawnSync} from 'node:child_process';
if(!process.env.TEST_DATABASE_URL || !new URL(process.env.TEST_DATABASE_URL).pathname.includes('test')) throw new Error('Set a disposable TEST_DATABASE_URL');
const result=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','tests/database.test.ts',...process.argv.slice(2)],{env:{...process.env,DATABASE_URL:process.env.TEST_DATABASE_URL,NODE_ENV:'test'},stdio:'inherit'});process.exitCode=result.status || 0;
