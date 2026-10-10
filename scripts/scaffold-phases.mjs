import {mkdirSync,writeFileSync} from 'node:fs';
export function endpoint(path, methods, imports) {
 const dir='app/api/v1/'+path; mkdirSync(dir,{recursive:true});
 let code="export const runtime = 'nodejs';\nimport { route, preflight } from '@/modules/auth/routes-helpers';\n"+imports+"\nexport const OPTIONS = preflight;\n";
 const dynamic=path.includes('[');
 if(dynamic)code+="import { NextRequest } from 'next/server';\nimport { z } from 'zod';\n";
 for(const [method,schema,action,auth=false,cache=false] of methods){
  if(dynamic){const param=path.match(/\[(\w+)\]/)[1];code+=`export async function ${method}(req: NextRequest, context: { params: Promise<{ ${param}: string }> }) {\n const params=await context.params;\n return route('${path}', ${schema}, async (data, request, identity) => { const id=z.string().${param==='codeOrId'?'min(2).max(40)':'uuid()'}.parse(params.${param}); return ${action}; }, ${JSON.stringify(auth)}, ${cache})(req);\n}\n`;}
  else code+=`export const ${method}=route('${path}', ${schema}, async (data, request, identity) => ${action}, ${JSON.stringify(auth)}, ${cache});\n`;
 }
 // Static action declarations may not use every wrapper argument.
 code=code.replace(/async \(data, request, identity\) => ([^\n]+)/g,(_,body)=>{let args=['data','request','identity'].map(arg=>new RegExp('\\b'+arg+'\\b').test(body)?arg:'_'+arg);return 'async ('+args.join(', ')+') => '+body;});
 code=code.replace(/import \{ ([^}]+) \} from ([^;]+);/g,(full,names,source)=>{
  const rest=code.replace(full,'');const used=names.split(',').map(n=>n.trim()).filter(n=>new RegExp('\\b'+n.split(' as ').at(-1)+'\\b').test(rest));return used.length?'import { '+used.join(', ')+' } from '+source+';':'';
 });
 code=code.replace(/import \{ ([^}]+) \} from ([^;]+);/g,(full,names,source)=>{const rest=code.replace(full,'');const used=names.split(',').map(n=>n.trim()).filter(n=>new RegExp('\\b'+n.split(' as ').at(-1)+'\\b').test(rest));return used.length?'import { '+used.join(', ')+' } from '+source+';':'';});
 const executable=code.replace(/^import .*$/gm,'');
 code=code.replace(/import \{ ([^}]+) \} from ([^;]+);/g,(_,names,source)=>{const used=names.split(',').map(n=>n.trim()).filter(n=>new RegExp('\\b'+n.split(' as ').at(-1)+'\\b').test(executable));return used.length?'import { '+used.join(', ')+' } from '+source+';':'';});
 writeFileSync(dir+'/route.ts',code);
}
const imports="import { catalogSchemas as schemas, empty } from '@/modules/catalog/schemas';\nimport * as service from '@/modules/catalog/service';";
for(const name of ['departments','programs','modules','papers']) endpoint(name,[['GET',`schemas.${name}`,`service.${name}(data)`,false,true]],imports);
for(const [path,fn] of [['departments/[id]','department'],['programs/[id]','program'],['modules/[codeOrId]','moduleDetail'],['papers/[id]','paper']]) endpoint(path,[['GET','empty',`service.${fn}(id)`,false,true]],imports);
for(const sort of ['recent','popular'])endpoint('papers/'+sort,[['GET','schemas.papers',`service.papers({...data,sortBy:'${sort}'})`,false,true]],imports);
const uploads="import { uploadSchemas as schemas } from '@/modules/uploads/schemas';\nimport { empty, catalogSchemas } from '@/modules/catalog/schemas';\nimport * as service from '@/modules/uploads/service';";
endpoint('uploads/presign',[['POST','schemas.presign','service.presign(identity!.user,data)',true]],uploads);
endpoint('uploads/[id]/complete',[['POST','empty','service.complete(identity!.user,id)',true]],uploads);
endpoint('papers',[['GET','catalogSchemas.papers','catalog.papers(data)',false,true],['POST','schemas.create','service.createPaper(identity!.user,data)',true]],uploads+"\nimport * as catalog from '@/modules/catalog/service';");
endpoint('papers/duplicate-check',[['POST','schemas.duplicate','service.duplicateCheck(identity!.user,data)',true]],uploads);
const eventImports=uploads+"\nimport { ipHash } from '@/lib/crypto';";
endpoint('papers/[id]/view',[['POST','empty',"service.view(id,ipHash(request.headers.get('cf-connecting-ip') || 'local'))",'optional']],eventImports);
endpoint('papers/[id]/download-url',[['POST','schemas.download',"service.download(id,data.kind,ipHash(request.headers.get('cf-connecting-ip') || 'local'))",'optional']],eventImports);
endpoint('users/me/papers',[['GET','catalogSchemas.departments','service.myPapers(identity!.user,data)',true]],uploads);
const moderation="import { moderationSchemas as schemas } from '@/modules/moderation/schemas';\nimport * as service from '@/modules/moderation/service';\nimport { empty, catalogSchemas } from '@/modules/catalog/schemas';";
endpoint('admin/papers',[['GET','schemas.adminPapers','service.adminPapers(identity!.user,data)',true]],moderation);
endpoint('admin/papers/[id]',[['GET','empty','service.adminPaper(identity!.user,id)',true]],moderation);
endpoint('admin/papers/[id]/review',[['PATCH','schemas.review','service.review(identity!.user,id,data)',true]],moderation);
endpoint('admin/papers/[id]/download-url',[['POST','uploadSchemas.download','service.reviewFile(identity!.user,id,data.kind)',true]],moderation+"\nimport { uploadSchemas } from '@/modules/uploads/schemas';");
for(const [path,schema,fn] of [['flags','flags','flag'],['takedowns','takedowns','takedown'],['module-requests','moduleRequests','moduleRequest']])endpoint(path,[['POST',`schemas.${schema}`,`service.${fn}(data,identity?.user)`,'optional']],moderation);
for(const [kind,schema,fn] of [['flags','resolveFlag','resolveFlag'],['takedowns','resolveTakedown','resolveTakedown'],['module-requests','resolveModule','resolveModule']]){
 endpoint('admin/'+kind,[['GET','schemas.queue',`service.queue(identity!.user,'${kind}',data)`,true]],moderation);
 endpoint('admin/'+kind+'/[id]',[['PATCH',`schemas.${schema}`,`service.${fn}(identity!.user,id,data)`,true]],moderation);
}
const gamification=moderation.replace("@/modules/moderation/service","@/modules/gamification/service");
endpoint('leaderboard',[['GET','schemas.leaderboard','service.leaderboard(identity!.user,data)',true]],gamification);
endpoint('users/me/achievements',[['GET','empty','service.achievements(identity!.user)',true]],gamification);
endpoint('notifications',[['GET','catalogSchemas.departments','service.notifications(identity!.user,data)',true]],gamification);
endpoint('notifications/[id]',[['PATCH','schemas.readNotification','service.readNotification(identity!.user,id)',true]],gamification);
endpoint('notifications/read-all',[['POST','empty','service.readNotification(identity!.user)',true]],gamification);
endpoint('admin/users/[id]/xp-ledger',[['GET','catalogSchemas.departments','service.ledger(identity!.user,id,data)',true]],gamification);
