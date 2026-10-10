import { spawnSync } from 'node:child_process';
if(!process.env.TEST_DATABASE_URL || !new URL(process.env.TEST_DATABASE_URL).pathname.startsWith('/epapers_phase12_test_')) throw new Error('Only the isolated phase test database may be repaired');
const result=spawnSync(process.execPath,['--use-system-ca','node_modules/prisma/build/index.js','migrate','resolve','--rolled-back','0004_integrity'],{env:{...process.env,DATABASE_URL:process.env.TEST_DATABASE_URL},stdio:'inherit'});
process.exitCode=result.status || 0;
