import {mkdirSync,writeFileSync} from 'node:fs';
export function endpoint(path, methods, imports) {
 const dir='app/api/v1/'+path; mkdirSync(dir,{recursive:true});
 let code="export const runtime = 'nodejs';\nimport { route, preflight } from '@/modules/auth/routes-helpers';\n"+imports+"\nexport const OPTIONS = preflight;\n";
 const dynamic=path.includes('[');
 if(dynamic)code+="import { NextRequest } from 'next/server';\nimport { z } from 'zod';\n";
 for(const [method,schema,action,auth=false,cache=false] of methods){
  if(dynamic){const param=path.match(/\[(\w+)\]/)[1];code+=`export async function ${method}(req: NextRequest, context: { params: Promise<{ ${param}: string }> }) {\n const params=await context.params;\n return route('${path}', ${schema}, async (data, request, identity) => { const id=z.string().${param==='codeOrId'?'min(2).max(40)':'uuid()'}.parse(params.${param}); return ${action}; }, ${auth}, ${cache})(req);\n}\n`;}
  else code+=`export const ${method}=route('${path}', ${schema}, async (data, request, identity) => ${action}, ${auth}, ${cache});\n`;
 }
 // Static action declarations may not use every wrapper argument.
 for(const arg of ['data','request','identity']) if(!methods.some(m=>new RegExp('\\b'+arg+'\\b').test(m[2]))) code=code.replaceAll(arg+',', '_'+arg+',').replaceAll(arg+')', '_'+arg+')');
 if(!methods.some(m=>m[1].includes('schemas.')))code=code.replace('catalogSchemas as schemas, empty','empty');
 if(!methods.some(m=>m[1]==='empty'))code=code.replace('catalogSchemas as schemas, empty','catalogSchemas as schemas');
 writeFileSync(dir+'/route.ts',code);
}
const imports="import { catalogSchemas as schemas, empty } from '@/modules/catalog/schemas';\nimport * as service from '@/modules/catalog/service';";
for(const name of ['departments','programs','modules','papers']) endpoint(name,[['GET',`schemas.${name}`,`service.${name}(data)`,false,true]],imports);
for(const [path,fn] of [['departments/[id]','department'],['programs/[id]','program'],['modules/[codeOrId]','moduleDetail'],['papers/[id]','paper']]) endpoint(path,[['GET','empty',`service.${fn}(id)`,false,true]],imports);
for(const sort of ['recent','popular'])endpoint('papers/'+sort,[['GET','schemas.papers',`service.papers({...data,sortBy:'${sort}'})`,false,true]],imports);
