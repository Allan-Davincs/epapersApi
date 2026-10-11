import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFileSync } from 'node:fs';
const listener=createServer();await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
const child=spawn(process.execPath,['.next/standalone/server.js'],{env:{...process.env,NODE_ENV:'production',HOSTNAME:'127.0.0.1',PORT:String(port)},stdio:'ignore'});
const root=`http://127.0.0.1:${port}/api/v1`,results=[];
try{
 let ready=false;for(let i=0;i<60;i++){if(child.exitCode!==null)break;try{const res=await fetch(root+'/health',{signal:AbortSignal.timeout(3000)});if(res.ok){ready=true;break;}}catch{/* Retry while the standalone process starts. */}await new Promise(resolve=>setTimeout(resolve,500));}
 if(!ready)throw new Error('Standalone did not become healthy');
 for(const [path,expected] of [['/health',200],['/departments',200],['/settings/public',200],['/announcements/active',200],['/admin/users',401],['/lecturer/verifications',405],['/auth/me',401],['/leaderboard',401],['/modules?limit=1&limit=2',422]]){
  const res=await fetch(root+path,{headers:{Origin:process.env.APP_ORIGIN},signal:AbortSignal.timeout(10000)});const body=await res.json().catch(()=>null);
  if(res.status!==expected)throw new Error('Unexpected route status');
  if(expected!==405&&res.headers.get('x-content-type-options')!=='nosniff')throw new Error('Missing security header');
  if(path.startsWith('/admin')&&res.headers.get('cache-control')!=='no-store')throw new Error('Private response cached');
  if(path==='/departments'&&(!Array.isArray(body?.data?.items)||body.data.items.some(d=>d.email||d.xp)))throw new Error('Public DTO mismatch');
  results.push({route:path,status:res.status});
 }
 const res=await fetch(root+'/admin/settings',{method:'PATCH',headers:{Origin:'https://invalid.example','Content-Type':'application/json'},body:'{}'});if(res.status!==403)throw new Error('CSRF accepted');results.push({route:'/admin/settings (invalid origin)',status:res.status});
 writeFileSync('docs/SMOKE-RESULTS.json',JSON.stringify({timestamp:new Date().toISOString(),scope:'Built standalone process; configured database; no authenticated mutation, file transfer or email.',checks:results},null,2)+'\n');console.info('Standalone smoke checks passed:',results.length);
}catch{console.error('Standalone smoke checks failed; environment and response bodies omitted.');process.exitCode=1;}finally{child.kill();await new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null)resolve();else child.once('exit',resolve);});}
