import { spawnSync } from 'node:child_process';
const result=spawnSync('git',['-c','safe.directory='+process.cwd().replaceAll('\\','/'),'ls-files'],{encoding:'utf8'});
if(result.status!==0) {console.error('Could not inspect tracked files');process.exit(1);}
const forbidden=result.stdout.trim().split('\n').filter(file=>/(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.env.example') || /\.(pem|key|p12|pfx)$/.test(file));
if(forbidden.length) {console.error('Forbidden tracked secret files:',forbidden.join(', '));process.exit(1);}
console.info('No environment files or private-key files are tracked.');
