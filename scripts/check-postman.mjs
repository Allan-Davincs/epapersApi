import { readFileSync } from 'node:fs';
import { Script,createContext } from 'node:vm';
import assert from 'node:assert/strict';
import { validateContract } from './postman-contract.mjs';
const collection=JSON.parse(readFileSync('postman.json','utf8')),environment=JSON.parse(readFileSync('postman/epapers.environment.json','utf8')),api=JSON.parse(readFileSync('docs/openapi.yaml','utf8'));
const items=collection.item.flatMap(f=>f.item),canonical=items.filter(i=>/^(GET|POST|PATCH|DELETE) \//.test(i.name));
const expected=Object.entries(api.paths).flatMap(([p,ops])=>Object.keys(ops).map(m=>m.toUpperCase()+' '+p));
assert.deepEqual(canonical.map(i=>i.name).sort(),expected.sort(),'Every OpenAPI operation must be present exactly once');
assert.equal(items.length,expected.length+10);
const env=Object.fromEntries(environment.values.map(v=>[v.key,v.value]));
for(const key of ['accessToken','adminAccessToken','lecturerAccessToken','password','adminPassword','adminEmailOtp','adminLoginChallengeToken','adminReauthChallengeToken','reauthToken']){assert.equal(env[key],'');assert.equal(environment.values.find(v=>v.key===key).type,'secret');}
for(const key of ['allowMutations','allowDestructive','allowExternalActions'])assert.equal(env[key],'false');
const sampleValues={...Object.fromEntries(Object.keys(env).map(k=>[k,'11111111-1111-4111-8111-111111111111'])),baseUrl:'http://localhost:3001/api/v1',appOrigin:'https://app.example.com',username:'pm_fixture',email:'pm@example.com',password:'Postman unique test password1!',newPassword:'Postman new unique password2!',adminPassword:'Postman admin unique password!',fullName:'Postman Test',emailOtp:'123456',adminEmailOtp:'123456',adminLoginChallengeToken:'x'.repeat(43),adminReauthChallengeToken:'x'.repeat(43),resetToken:'x'.repeat(40),uploadSizeBytes:'1024',uploadFilename:'paper.pdf'};
for(const item of items){
 for(const event of item.event)new Script(event.script.exec.join('\n'),{filename:item.name+' '+event.listen});
 const encoded=JSON.stringify(item.request),refs=[...encoded.matchAll(/\{\{(\w+)\}\}/g)].map(m=>m[1]);for(const key of refs)assert.ok(key in env,'Missing environment variable '+key);
 if(!canonical.includes(item))continue;
 const split=item.name.indexOf(' '),method=item.name.slice(0,split).toLowerCase(),path=item.name.slice(split+1),op=api.paths[path][method];
 const ref=op.requestBody?.content?.['application/json']?.schema?.$ref?.split('/').at(-1);
 if(ref){const raw=item.request.body.raw.replace(/\{\{(\w+)\}\}/g,(_,key)=>sampleValues[key]);assert.deepEqual(validateContract(JSON.parse(raw),api.components.schemas[ref],api.components.schemas),[],item.name+' example body');}
}
function run(item,values,data,status=200){
 const vars={...env,...values},saved={},failures=[];let skipped=false,count=0;
 const pm={request:{url:{toString:()=>item.request.url.raw},body:{raw:item.request.body?.raw,update:value=>{vars._rendered=value;}}},variables:{get:k=>vars[k],set:(k,v)=>{vars[k]=v;}},environment:{get:k=>values[k]??env[k],set:(k,v)=>{saved[k]=v;}},collectionVariables:{get:k=>collection.variable.find(v=>v.key===k)?.value},execution:{skipRequest:()=>{skipped=true;}},response:{code:status,responseTime:10,headers:{get:key=>({'Content-Type':'application/json','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Access-Control-Allow-Origin':values.corsOrigin,'Access-Control-Allow-Credentials':'true'})[key]},json:()=>data},test:(name,fn)=>{count++;try{fn();}catch{failures.push(name);}}};
 const context=createContext({pm,console:{warn:()=>{}}});new Script(item.event[0].script.exec.join('\n')).runInContext(context);
 if(!skipped)new Script(item.event[1].script.exec.join('\n')).runInContext(context);
 return {skipped,saved,failures,count,rendered:vars._rendered};
}
const find=name=>items.find(i=>i.name===name);
assert.equal(run(find('PATCH /admin/settings'),{},{}).skipped,true,'Writes skip by default');
assert.equal(run(find('POST /auth/login'),{},{}).skipped,true,'Missing credentials skip');
assert.equal(run(find('POST /auth/change-password'),{allowMutations:'true',accessToken:'fake-access',password:'local-only',newPassword:'FreshPass7'},{}).skipped,true,'Password changes require the destructive gate');
const changed=run(find('POST /auth/change-password'),{allowMutations:'true',allowDestructive:'true',accessToken:'fake-access',password:'local-only',newPassword:'FreshPass7'},{data:{message:'Password changed. Please sign in again.'}});
assert.equal(changed.skipped,false);assert.deepEqual(changed.failures,[]);assert.deepEqual(JSON.parse(changed.rendered),{currentPassword:'local-only',password:'FreshPass7'});
const profile={id:sampleValues.moduleId,username:'fixture',email:'pm@example.com',fullName:'Postman Test',bio:'',avatarId:null,role:'contributor',emailVerified:true,isLecturerVerified:false,homeDepartmentId:null,levelTitle:'Novice Archivist',joinedAt:'2026-01-01T00:00:00.000Z'};
const login=run(find('POST /auth/login'),{allowExternalActions:'true',username:'fixture',password:'local-only'},{data:{accessToken:'fake-access',user:profile}});assert.deepEqual(login.failures,[]);assert.equal(login.saved.accessToken,'fake-access');
const adminChallenge={verificationRequired:true,challengeToken:'x'.repeat(43),expiresAt:'2026-01-01T00:10:00.000Z',resendAfter:'2026-01-01T00:01:00.000Z',message:'Enter email code'};
const adminCode=run(find('POST /auth/admin/login'),{allowExternalActions:'true',adminUsername:'fixture',adminPassword:'local-only'},{data:adminChallenge});assert.deepEqual(adminCode.failures,[]);assert.equal(adminCode.saved.adminLoginChallengeToken,adminChallenge.challengeToken);assert.equal(adminCode.saved.adminAccessToken,undefined);
const actionCode=run(find('POST /auth/reauth'),{allowExternalActions:'true',adminAccessToken:'fake-admin',adminPassword:'local-only'},{data:adminChallenge});assert.deepEqual(actionCode.failures,[]);assert.equal(actionCode.saved.adminReauthChallengeToken,adminChallenge.challengeToken);
const quoted=run(find('POST /auth/login'),{allowExternalActions:'true',username:'fixture',password:'local "quoted" password'},{data:{accessToken:'fake-access',user:profile}});assert.equal(JSON.parse(quoted.rendered).password,'local "quoted" password');
const publicResult=run(find('GET /departments'),{},{data:{items:[],nextCursor:null}});assert.deepEqual(publicResult.failures,[]);assert.ok(publicResult.count>=6);
assert.ok(run(find('GET /departments'),{},{data:{items:[{email:'leak@example.com'}],nextCursor:null}}).failures.includes('Public identity/XP privacy'));
assert.ok(run(find('GET /departments'),{},{data:{items:[],nextCursor:null,passwordHash:'leak'}}).failures.includes('No credentials or raw storage keys leaked'));
const csv=run(find('POST /admin/modules/import'),{allowMutations:'true',adminAccessToken:'fake-admin',csvText:'code,name,programCode,semester,levelYear,credits\nAB,Name,PMTESTPROG,1,2,4'},{data:{dryRun:true,valid:true,importedCount:0,rows:[],errors:[]}});assert.equal(JSON.parse(csv.rendered).csv.includes('\nAB'),true);assert.deepEqual(csv.failures,[]);
assert.deepEqual(run(find('CORS preflight allows app origin'),{corsOrigin:env.appOrigin},null,204).failures,[]);
assert.deepEqual(run(find('CORS preflight rejects another origin'),{},null,403).failures,[]);
const edited=JSON.parse(JSON.stringify(find('PATCH /admin/settings')));edited.request.body.raw=JSON.stringify({readOnly:false,reason:'Edited request example'});
const editedResult=run(edited,{allowMutations:'true',adminAccessToken:'fake-admin',reauthToken:'fake-proof'},{data:{readOnly:false}});assert.equal(editedResult.skipped,false);assert.deepEqual(JSON.parse(editedResult.rendered),{readOnly:false,reason:'Edited request example'});assert.deepEqual(editedResult.failures,[]);
const negative=run(find('Guest cannot read admin users'),{},{error:{code:'UNAUTHORIZED',message:'Authentication required'}},401);assert.deepEqual(negative.failures,[]);
assert.ok(run(find('Guest cannot read admin users'),{},{error:{code:'UNAUTHORIZED',message:'Authentication required',stack:'SQL leak'}},401).failures.includes('OpenAPI error DTO'));
console.info(`Postman verification passed: ${canonical.length} API operations, ${items.length-canonical.length} extra requests, script syntax, examples, safe gates, token capture, DTO/privacy/error regressions. No HTTP requests sent.`);
