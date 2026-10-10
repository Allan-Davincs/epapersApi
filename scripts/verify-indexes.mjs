import { spawnSync } from 'node:child_process';
if(!process.env.TEST_DATABASE_URL || !new URL(process.env.TEST_DATABASE_URL).pathname.includes('test')) throw new Error('Set a disposable TEST_DATABASE_URL');
const result=spawnSync(process.execPath,['--conditions=react-server','--import','tsx','scripts/explain-indexes.ts'],{env:{...process.env,DATABASE_URL:process.env.TEST_DATABASE_URL},stdio:'inherit'});process.exitCode=result.status || 0;
