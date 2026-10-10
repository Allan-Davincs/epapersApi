import { readFileSync,writeFileSync,mkdirSync,existsSync } from 'node:fs';
import { validateContract } from './postman-contract.mjs';
const api=JSON.parse(readFileSync('docs/openapi.yaml','utf8')),schemas=api.components.schemas;
const defaults={baseUrl:'http://localhost:3001/api/v1',appOrigin:'https://app.example.com',allowMutations:'false',allowDestructive:'false',allowExternalActions:'false',runNegativeTests:'true',maxResponseMs:'10000',username:'',email:'',password:'',newPassword:'',fullName:'Postman Test User',adminUsername:'',adminPassword:'',adminTotp:'',lecturerUsername:'',lecturerPassword:'',emailOtp:'',resetToken:'',accessToken:'',adminAccessToken:'',lecturerAccessToken:'',reauthToken:'',departmentId:'',programId:'',moduleId:'',paperId:'',targetUserId:'',sessionId:'',notificationId:'',flagId:'',takedownId:'',moduleRequestId:'',verificationId:'',contactId:'',announcementId:'',createdDepartmentId:'',createdProgramId:'',createdModuleId:'',uploadId:'',examUploadId:'',markingSchemeUploadId:'',uploadUrl:'',downloadUrl:'',uploadKind:'exam',uploadFilename:'paper.pdf',uploadSizeBytes:'',programCode:'',csvText:'',xpGrantRequestId:'',loggedUserRole:''};
const variables=new Set(Object.keys(defaults));
const variable=name=>{variables.add(name);return '{{'+name+'}}';};
function sample(schema,key='value'){
 if(schema.$ref)return sample(schemas[schema.$ref.split('/').at(-1)],key);
 if(schema.const!==undefined)return schema.const;
 if(schema.default!==undefined)return schema.default;
 if(schema.enum)return schema.enum[0];
 if(schema.anyOf)return sample(schema.anyOf.find(s=>s.type!=='null')||schema.anyOf[0],key);
 if(schema.type==='object')return Object.fromEntries(Object.entries(schema.properties||{}).filter(([k])=>schema.required?.includes(k)).map(([k,s])=>[k,sample(s,k)]));
 if(schema.type==='array')return [];
 if(schema.type==='boolean')return true;
 if(schema.type==='integer'||schema.type==='number')return Math.max(schema.minimum??1,(schema.exclusiveMinimum??0)+1);
 if(schema.format==='uuid')return variable(key);
 if(schema.format==='date-time')return '2026-01-01T00:00:00.000Z';
 const mapping={username:'username',usernameOrEmail:'username',email:'email',password:'password',fullName:'fullName',code:'emailOtp',totp:'adminTotp',token:'resetToken',filename:'uploadFilename'};
 if(mapping[key])return variable(mapping[key]);
 return ({reason:'Postman isolated test',note:'Postman isolated test',title:'Postman paper',name:'Postman entry',description:'Postman test description',content:'Postman campus notice',evidence:'Appointment evidence checked by operator',subject:'Postman contact test',message:'Postman contact message',senderName:'Postman Test User',senderEmail:'{{email}}',requesterFullName:'Postman Test User',requesterEmail:'{{email}}',affiliation:'DIT',moduleCode:'PMTEST01',moduleName:'Postman Test Module',academicYear:2026,awardTitle:'Bachelor degree',csv:'{{csvText}}'})[key]||'Postman sample';
}
function bodyFor(path,method,schema){
 const body=sample(schema);
 if(path==='/auth/admin/login')return {usernameOrEmail:variable('adminUsername'),password:variable('adminPassword'),totp:variable('adminTotp')};
 if(path==='/auth/reauth')return {password:variable('adminPassword'),totp:variable('adminTotp')};
 if(path==='/auth/reset-password')body.password=variable('newPassword');
 if(path==='/users/me')return {bio:'Postman profile test'};
 if(path==='/uploads/presign')return {filename:variable('uploadFilename'),contentType:'application/pdf',sizeBytes:'__UPLOAD_SIZE_NUMBER__'};
 if(path==='/papers'||path==='/papers/duplicate-check'){body.academicYear=2026;body.semester=1;body.category='UE';}
 if(path==='/admin/users/{id}'&&method==='patch')return {grantXp:{amount:1,requestId:variable('xpGrantRequestId')},reason:'Postman positive idempotent award'};
 if(['/admin/settings','/admin/security'].includes(path)&&method==='patch')return {bannerMessage:'Postman test banner',reason:'Postman settings test'};
 if(path.includes('/announcements')&&method==='patch')return {title:'Postman updated notice',reason:'Postman announcement test'};
 if(path==='/admin/announcements'&&method==='post')body.startsAt='2026-01-01T00:00:00.000Z';
 if(path==='/admin/departments'&&method==='post')body.code='PMTESTDEP';
 if(path==='/admin/programs'&&method==='post'){body.departmentId=variable('createdDepartmentId');body.code='PMTESTPROG';body.campus='MAIN';}
 if(path==='/admin/modules'&&method==='post'){body.programId=variable('createdProgramId');body.code='PMTESTMOD';body.semester=1;}
 if(path==='/admin/modules/import')return {csv:variable('csvText'),dryRun:true,reason:'Postman CSV preview'};
 if(/^\/admin\/(departments|programs|modules)\/\{id\}$/.test(path)&&method==='patch')return {name:'Postman updated entry',reason:'Postman update'};
 return body;
}
function idFor(path,method,name){
 if(name==='username')return 'username';if(name==='codeOrId')return 'moduleId';if(name!=='id')return name;
 if(path.includes('/uploads/'))return 'uploadId';if(path.includes('/papers/'))return 'paperId';if(path.includes('/users/')&&!path.includes('/sessions/'))return 'targetUserId';if(path.includes('/sessions/'))return 'sessionId';
 const pairs=[['departments','departmentId'],['programs','programId'],['modules','moduleId'],['notifications','notificationId'],['flags','flagId'],['takedowns','takedownId'],['module-requests','moduleRequestId'],['lecturer-verifications','verificationId'],['contact-messages','contactId'],['announcements','announcementId']];
 for(const [segment,key] of pairs)if(path.includes('/'+segment+'/'))return path.startsWith('/admin/')&&['patch','delete'].includes(method)&&['departmentId','programId','moduleId'].includes(key)?'created'+key[0].toUpperCase()+key.slice(1):key;
 throw new Error('Unknown path parameter: '+path);
}
const sharedTests=`
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const expected=Number(pm.variables.get('_status')||200);
pm.test('Expected HTTP status',()=>check(pm.response.code===expected,'Unexpected HTTP status'));
pm.test('JSON content type',()=>check((pm.response.headers.get('Content-Type')||'').includes('application/json'),'Expected JSON'));
pm.test('Security header',()=>check(pm.response.headers.get('X-Content-Type-Options')==='nosniff','Missing nosniff'));
pm.test('Response time budget',()=>check(pm.response.responseTime<=Number(pm.variables.get('maxResponseMs')||10000),'Response exceeded configured budget'));
if(pm.variables.get('_private')==='true')pm.test('Private response not cached',()=>check(pm.response.headers.get('Cache-Control')==='no-store','Expected no-store'));
let json;try{json=pm.response.json();}catch{/* JSON assertion reports non-JSON. */}
if(json){
 pm.test('Envelope',()=>check(expected<400?json.data!==undefined&&json.error===undefined:!!json.error&&typeof json.error.code==='string'&&typeof json.error.message==='string','Invalid envelope'));
 if(expected>=400)pm.test('OpenAPI error DTO',()=>{const definitions=JSON.parse(pm.collectionVariables.get('_schemas'));check(validateContract(json,definitions.error,definitions).length===0,'Error DTO does not match OpenAPI');});
 if(expected<400)pm.test('OpenAPI response DTO',()=>{const definitions=JSON.parse(pm.collectionVariables.get('_schemas'));const name=pm.variables.get('_schema');check(validateContract(json.data,definitions[name],definitions).length===0,'Response DTO does not match OpenAPI');});
 const visit=(v,fn)=>{if(v&&typeof v==='object')for(const [k,item] of Object.entries(v)){fn(k,item);visit(item,fn);}};
 pm.test('No credentials or raw storage keys leaked',()=>visit(json,(key,value)=>{if(/^(password|passwordHash|totpSecret|refreshTokenHash|objectKey|bucketName|DATABASE_URL)$/i.test(key))check(value==='[REDACTED]','Sensitive response field leaked');}));
 if(pm.variables.get('_publicPrivacy')==='true'&&expected<400)pm.test('Public identity/XP privacy',()=>visit(json.data,(key)=>check(!['email','fullName','xp','allTimeXp','status'].includes(key),'Private field in public DTO')));
 if(pm.response.code===200&&expected===200){
  const d=json.data,save=(key,value)=>{if(value!==undefined&&value!==null)pm.environment.set(key,value);};
  if(d.accessToken&&d.user){save(d.user.role==='admin'?'adminAccessToken':'accessToken',d.accessToken);if(d.user.role==='lecturer')save('lecturerAccessToken',d.accessToken);if(d.user.role!=='admin')save('loggedUserRole',d.user.role);}
  if(d.reauthToken)save('reauthToken',d.reauthToken);
  const capture=pm.variables.get('_capture');if(capture){const value=Array.isArray(d.items)?d.items[0]?.id:d.id;if(!pm.environment.get(capture)||pm.variables.get('_overwriteCapture')==='true')save(capture,value);}
  if(d.uploadId){save('uploadId',d.uploadId);save(pm.variables.get('uploadKind')==='marking_scheme'?'markingSchemeUploadId':'examUploadId',d.uploadId);save('uploadUrl',d.uploadUrl);save('uploadExpiresAt',d.expiresAt);}
  if(d.url){save('downloadUrl',d.url);save('downloadExpiresAt',d.expiresAt);}
 }
}
`;
const folders=new Map();const group=name=>{if(!folders.has(name))folders.set(name,{name,item:[]});return folders.get(name).item;};
function folder(path,method){if(path==='/papers'&&method==='post')return '04 Upload workflow';if(path.startsWith('/auth/'))return path.startsWith('/auth/admin')||path==='/auth/reauth'?'02 Admin authentication':/^\/auth\/(logout|sessions)/.test(path)?'90 Sessions and logout':'01 User authentication';if(path.startsWith('/admin/'))return '06 Admin operations';if(path.startsWith('/users/me')||path.startsWith('/notifications')||path==='/leaderboard')return '03 Private account and leaderboard';if(path.startsWith('/uploads')||path==='/papers/duplicate-check')return '04 Upload workflow';if(path.startsWith('/lecturer'))return '08 Lecturer verification';if(['/flags','/takedowns','/contact-messages','/module-requests'].includes(path))return '07 Reports and contact';return '00 Public catalog';}
function create(path,method,operation,options={}){
 const output=operation.responses?.['200']?.content?.['application/json']?.schema?.properties?.data?.$ref?.split('/').at(-1);
 const protectedRoute=operation.security?.length>0&&!operation.security.some(s=>Object.keys(s).length===0)&&operation.security.some(s=>s.bearerAuth);
 const admin=path.startsWith('/admin/')||path==='/auth/reauth',token=admin?'adminAccessToken':path.startsWith('/lecturer/')?'lecturerAccessToken':'accessToken';
 let url=variable('baseUrl')+path.replace(/\{(\w+)\}/g,(_,name)=>variable(idFor(path,method,name)));
 const query=(operation.parameters||[]).filter(p=>p.in==='query').map(p=>({key:p.name,value:p.name==='limit'?'25':String(p.schema.default??sample(p.schema,p.name)),disabled:!p.required&&p.name!=='limit'}));
 const headers=[{key:'Accept',value:'application/json'}];if(method==='get')headers.push({key:'Origin',value:variable('appOrigin')});if(method!=='get')headers.push({key:'Content-Type',value:'application/json'},{key:'Origin',value:variable('appOrigin')},{key:'X-EPapers-Client',value:'web'});
 if(operation.parameters?.some(p=>p.name==='X-EPapers-Reauth'))headers.push({key:'X-EPapers-Reauth',value:variable('reauthToken')});
 const inputRef=operation.requestBody?.content?.['application/json']?.schema?.$ref?.split('/').at(-1);
 const body=inputRef?bodyFor(path,method,schemas[inputRef]):{};
 let raw=JSON.stringify(body,null,2).replace('"__UPLOAD_SIZE_NUMBER__"','{{uploadSizeBytes}}');
 const request={method:method.toUpperCase(),header:headers,auth:protectedRoute?{type:'bearer',bearer:[{key:'token',value:variable(token),type:'string'}]}:{type:'noauth'},url:{raw:url+(query.filter(p=>!p.disabled).length?'?'+query.filter(p=>!p.disabled).map(p=>p.key+'='+p.value).join('&'):''),host:[variable('baseUrl')],path:url.slice('{{baseUrl}}/'.length).split('/'),query},description:(operation.description||'')+'\nSee docs/POSTMAN.md. Expected success: 200. Supply IDs from an isolated test setup; skipped requests are not passed tests.',...(method==='get'?{}:{body:{mode:'raw',raw,options:{raw:{language:'json'}}}})};
 const readOnly=method==='get'||['/auth/login','/auth/admin/login','/auth/reauth','/auth/username-availability'].includes(path);
 const destructive=method==='delete'||path.includes('/logout')||path==='/auth/reset-password'||path==='/auth/refresh'||path.endsWith('/restore');
 const external=['/auth/register','/auth/forgot-password','/auth/reset-password','/auth/verify-email','/auth/verify-otp','/auth/resend-otp','/auth/verification/resend','/uploads/presign','/papers','/flags','/takedowns','/contact-messages'].includes(path)||path.endsWith('/review');
 let capture=method==='get'?({'/departments':'departmentId','/programs':'programId','/modules':'moduleId','/papers':'paperId','/notifications':'notificationId'})[path]:({'/admin/departments':'createdDepartmentId','/admin/programs':'createdProgramId','/admin/modules':'createdModuleId','/papers':'paperId','/flags':'flagId','/takedowns':'takedownId','/module-requests':'moduleRequestId','/contact-messages':'contactId','/lecturer/verifications':'verificationId','/admin/announcements':'announcementId'})[path];
 const privacy=method==='get'&&(/^\/(departments|programs|modules|papers)(\/|$)/.test(path)||path.startsWith('/users/by-username'));
 const refs=[...JSON.stringify({...request,body:undefined}).matchAll(/\{\{(\w+)\}\}/g)].map(m=>m[1]);
 // Disabled optional query values do not need to be supplied.
 const required=[...new Set(refs.filter(n=>!query.some(q=>q.disabled&&q.value==='{{'+n+'}}')))];
 const pre=`pm.variables.set('_status',${JSON.stringify(String(options.status||200))});pm.variables.set('_schema',${JSON.stringify(output||'health')});pm.variables.set('_private',${JSON.stringify(String(path!=='/health'&&(!operation.description?.includes('max-age=60')&&!operation.description?.includes('cached 60/300'))))});pm.variables.set('_publicPrivacy',${JSON.stringify(String(privacy))});pm.variables.set('_capture',${JSON.stringify(capture||'')});pm.variables.set('_overwriteCapture',${JSON.stringify(String(method==='post'))});
const missing=[...new Set([...${JSON.stringify(required)},...[...(pm.request.body?.raw||'').matchAll(/\\{\\{(\\w+)\\}\\}/g)].map(m=>m[1])])].filter(k=>!pm.variables.get(k));
const gates=${JSON.stringify([...(options.negative?['runNegativeTests']:[]),...(!options.negative&&!readOnly?['allowMutations']:[]),...(!options.negative&&destructive?['allowDestructive']:[]),...(!options.negative&&external?['allowExternalActions']:[])])}.filter(k=>pm.variables.get(k)!=='true');
if(missing.length||gates.length){console.warn('SKIPPED: missing variables or disabled gates',missing.concat(gates).join(', '));pm.execution.skipRequest();}
${method!=='get'&&!options.negative?`else {const template=JSON.parse(pm.request.body.raw.replace(/:\\s*\\{\\{uploadSizeBytes\\}\\}/g,':"__UPLOAD_SIZE_NUMBER__"'));const render=v=>{if(Array.isArray(v))return v.map(render);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,item])=>[k,render(item)]));if(v==='__UPLOAD_SIZE_NUMBER__')return Number(pm.variables.get('uploadSizeBytes'));return typeof v==='string'?v.replace(/\\{\\{(\\w+)\\}\\}/g,(_,key)=>String(pm.variables.get(key)??'')):v;};pm.request.body.update(JSON.stringify(render(template)));}`:''}
`;
 const item={name:options.name||method.toUpperCase()+' '+path,request,event:[{listen:'prerequest',script:{type:'text/javascript',exec:pre.trim().split('\n')}},{listen:'test',script:{type:'text/javascript',exec:[validateContract.toString(),sharedTests].join('\n').trim().split('\n')}}]};
 if(options.negative){item.request.auth={type:'noauth'};item.request.url.query=[];item.request.url.raw=url;}
 return item;
}
let operations=0;
for(const [path,methods] of Object.entries(api.paths))for(const [method,op] of Object.entries(methods)){group(folder(path,method)).push(create(path,method,op));operations++;}
function negative(name,path,method,status,edit){const op=api.paths[path][method];const item=create(path,method,{...op,security:[]},{name,status,negative:true});edit?.(item);group('95 Negative security tests').push(item);}
negative('Guest cannot read admin users','/admin/users','get',401);
negative('Guest cannot read leaderboard','/leaderboard','get',401);
negative('Limit above 100 is rejected','/modules','get',422,i=>{i.request.url.raw+='?limit=101';i.request.url.query=[{key:'limit',value:'101'}];});
negative('Unknown query field is rejected','/modules','get',422,i=>{i.request.url.raw+='?unknown=1';i.request.url.query=[{key:'unknown',value:'1'}];});
negative('Duplicate query keys are rejected','/modules','get',422,i=>{i.request.url.raw+='?limit=1&limit=2';i.request.url.query=[{key:'limit',value:'1'},{key:'limit',value:'2'}];});
negative('Invalid origin is rejected before admin mutation','/admin/settings','patch',403,i=>{i.request.header=i.request.header.filter(h=>h.key!=='X-EPapers-Reauth');i.request.header.find(h=>h.key==='Origin').value='https://invalid.example';i.event[0].script.exec=i.event[0].script.exec.map(line=>line.replace('"reauthToken",','').replace(',"reauthToken"',''));});
negative('Admin role cannot be registered','/auth/register','post',422,i=>{i.request.body.raw=JSON.stringify({username:'postmannegative',email:'postmannegative@example.com',password:'Unique Postman negative password!',fullName:'Postman Test',role:'admin'});i.event[0].script.exec=i.event[0].script.exec.map(l=>l.startsWith('const missing=')?'const missing=[];':l);});
for(const invalid of [false,true])group(invalid?'95 Negative security tests':'00 Public catalog').push({name:invalid?'CORS preflight rejects another origin':'CORS preflight allows app origin',request:{method:'OPTIONS',auth:{type:'noauth'},url:'{{baseUrl}}/modules',header:[{key:'Origin',value:invalid?'https://invalid.example':'{{appOrigin}}'},{key:'Access-Control-Request-Method',value:'GET'},{key:'Access-Control-Request-Headers',value:'Content-Type,X-EPapers-Client,Authorization'}]},event:[{listen:'prerequest',script:{type:'text/javascript',exec:[invalid?"if(pm.variables.get('runNegativeTests')!=='true')pm.execution.skipRequest();":"if(!pm.variables.get('appOrigin'))pm.execution.skipRequest();"]}},{listen:'test',script:{type:'text/javascript',exec:[invalid?"pm.test('Foreign CORS origin denied',()=>{if(pm.response.code!==403||pm.response.headers.get('Access-Control-Allow-Origin'))throw new Error('Foreign CORS origin accepted');});":"pm.test('CORS app preflight allowed',()=>{if(pm.response.code!==204||pm.response.headers.get('Access-Control-Allow-Origin')!==pm.variables.get('appOrigin')||pm.response.headers.get('Access-Control-Allow-Credentials')!=='true')throw new Error('CORS preflight mismatch');});"]}}]});
// Direct object storage step is separate from API contract coverage.
group('04 Upload workflow').push({name:'R2 PUT PDF bytes (manual file selection)',request:{method:'PUT',auth:{type:'noauth'},header:[{key:'Content-Type',value:'application/pdf'},{key:'If-None-Match',value:'*'}],url:variable('uploadUrl'),body:{mode:'file',file:{src:''}},description:'Select the exact PDF used for uploadSizeBytes. Postman sets Content-Length. This is not an API request; no bearer/CSRF headers. Real R2 required.'},event:[{listen:'prerequest',script:{type:'text/javascript',exec:["if(pm.variables.get('allowExternalActions')!=='true'||pm.variables.get('allowMutations')!=='true'||!pm.variables.get('uploadUrl'))pm.execution.skipRequest();"]}},{listen:'test',script:{type:'text/javascript',exec:["pm.test('R2 upload succeeds',()=>{if(![200,204].includes(pm.response.code))throw new Error('R2 PUT failed');});"]}}]});
const uploadOrder=['POST /papers/duplicate-check','POST /uploads/presign','R2 PUT PDF bytes (manual file selection)','POST /uploads/{id}/complete','POST /papers'];
group('04 Upload workflow').sort((a,b)=>uploadOrder.indexOf(a.name)-uploadOrder.indexOf(b.name));
// Keep register before OTP/login and termination requests last; aliases are alternative calls.
const authOrder=['/auth/register','/auth/verify-email','/auth/verify-otp','/auth/login'];
group('01 User authentication').sort((a,b)=>(authOrder.indexOf(a.request.url.raw.replace('{{baseUrl}}',''))+1||99)-(authOrder.indexOf(b.request.url.raw.replace('{{baseUrl}}',''))+1||99));
mkdirSync('postman',{recursive:true});
const collection={info:{name:'EPapers API — complete contract and tests',description:`${operations} API operations generated from docs/openapi.yaml; seven negative tests, two CORS preflights and a manual R2 PUT. Mutation/external/destructive gates default false. See docs/POSTMAN.md. No credentials embedded.`,schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},variable:[{key:'_schemas',value:JSON.stringify(schemas),type:'string'}],item:[...folders.values()].sort((a,b)=>a.name.localeCompare(b.name))};
writeFileSync('postman.json',JSON.stringify(collection,null,2)+'\n');
writeFileSync('postman/epapers.environment.json',JSON.stringify({name:'EPapers local — fill values locally',values:[...variables].sort().map(key=>({key,value:defaults[key]??'',enabled:true,type:/password|token|totp|otp|Url$/i.test(key)&&key!=='baseUrl'?'secret':'default'})),_postman_variable_scope:'environment'},null,2)+'\n');
console.info(`Generated ${operations} API operations, seven negative tests, two CORS preflights and one R2 request.`);

if(existsSync('docs/POSTMAN.md')){
 const marker='<!-- GENERATED OPERATIONS -->';const prefix=readFileSync('docs/POSTMAN.md','utf8').split(marker)[0];
 const rows=Object.entries(api.paths).flatMap(([path,methods])=>Object.entries(methods).map(([method,op])=>{
  const ref=op.requestBody?.content?.['application/json']?.schema?.$ref?.split('/').at(-1);const required=ref?schemas[ref].required||[]:[];
  const access=path.startsWith('/admin/')?'Admin bearer':path==='/auth/reauth'?'Admin bearer':path.startsWith('/lecturer/')?'Lecturer bearer':op.security?.some(s=>s.refreshCookie)?'Refresh cookie':op.security?.some(s=>s.bearerAuth)&&!op.security.some(s=>Object.keys(s).length===0)?'User bearer':'Public / optional bearer';
  return '| '+method.toUpperCase()+' | '+path+' | '+access+' | '+(op.parameters?.some(p=>p.name==='X-EPapers-Reauth')?'Yes':'?')+' | '+(required.join(', ')||'{} / query only')+' |';
 }));writeFileSync('docs/POSTMAN.md',prefix+marker+'\n\n## Complete operation reference\n\nAll success requests expect HTTP 200. The collection includes strict request examples and tests for each operation. Required path/query parameters are shown in each request; this table lists required JSON fields. Optional fields and enums are defined in OpenAPI.\n\n| Method | Path (after /api/v1) | Authentication | Reauth | Required body fields |\n|---|---|---|---|---|\n'+rows.join('\n')+'\n');
}
