import { systemHealthSchema } from '../src/modules/admin/health-schema';
import { z } from 'zod';
import { adminSchemas } from '../src/modules/admin/schemas';
import { exportSchema,deleteAccountSchema } from '../src/modules/accounts/service';
import { privateProfileSchema } from '../src/modules/auth/schemas';
import { empty,catalogSchemas,uuid } from '../src/modules/catalog/schemas';
import { responseSchemas as shared } from './phase-openapi';
const time=z.string().datetime(),nullableTime=time.nullable(),page=(item:z.ZodType)=>z.strictObject({items:z.array(item),nextCursor:z.string().nullable()});
const user=z.strictObject({id:uuid,username:z.string(),fullName:z.string(),email:z.string().email(),role:z.enum(['contributor','lecturer','admin']),status:z.enum(['active','suspended','banned']),homeDepartmentId:uuid.nullable(),emailVerified:z.boolean(),lecturerVerified:z.boolean(),xp:z.number().int().nonnegative(),allTimeXp:z.number().int().nonnegative(),levelTitle:z.string(),joinedAt:time});
const settings=z.strictObject({usernameCooldownDays:z.number().int().optional(),retentionDays:z.number().int().optional(),lockdown:z.boolean().optional(),readOnly:z.boolean().optional(),bannerMessage:z.string().optional()});
const verification=z.strictObject({id:uuid,userId:uuid,departmentId:uuid,evidence:z.string(),status:z.enum(['pending','approved','rejected']),reviewNote:z.string().nullable(),createdAt:time,reviewedAt:nullableTime});
const announcement=z.strictObject({id:uuid,title:z.string(),content:z.string(),type:z.enum(['info','warning','alert','success']),isActive:z.boolean(),startsAt:time,endsAt:nullableTime});
const outputs={
 systemHealth:systemHealthSchema, adminUser:user,adminUsers:page(user),adminSettings:settings,
 publicSettings:z.strictObject({lockdown:z.boolean(),readOnly:z.boolean(),bannerMessage:z.string()}),
 securityPolicy:z.strictObject({settings,policy:z.strictObject({adminTotpRequired:z.boolean(),reauthSeconds:z.number(),accessSeconds:z.number(),adminAccessSeconds:z.number(),refreshRotation:z.boolean(),maxUploadBytes:z.number(),dailyUploadQuota:z.number(),publicSignedUrlSeconds:z.number()}),recentEvents:z.array(z.strictObject({id:uuid,action:z.string(),targetId:uuid.nullable(),createdAt:time}))}),
 verification,verificationPage:page(verification),announcement,announcementPage:page(announcement),
 adminDepartments:page(shared.department.extend({isActive:z.boolean()})),adminPrograms:page(shared.program.extend({isActive:z.boolean()})),adminModules:page(shared.module.extend({isActive:z.boolean()})),
 adminDepartment:shared.department.extend({isActive:z.boolean()}),adminProgram:shared.program.extend({isActive:z.boolean()}),adminModule:shared.module.extend({isActive:z.boolean()}),
 importResult:z.strictObject({dryRun:z.boolean(),valid:z.boolean(),importedCount:z.number().int().nonnegative(),rows:z.array(z.strictObject({code:z.string(),name:z.string(),programId:uuid,semester:z.number().int()})),errors:z.array(z.strictObject({row:z.number().int(),message:z.string()}))}),
 auditPage:page(z.strictObject({id:uuid,actorUserId:uuid.nullable(),action:z.string(),targetType:z.string(),targetId:uuid.nullable(),reason:z.string(),metadata:z.unknown(),createdAt:time})),
 dashboardStats:z.strictObject({pendingPapers:z.number().int(),approvedPapers:z.number().int(),users:z.number().int(),lecturers:z.number().int(),pendingVerifications:z.number().int(),flags:z.number().int(),takedowns:z.number().int(),moduleRequests:z.number().int(),downloads:z.number().int()}),
 contactsPage:page(z.strictObject({id:uuid,senderName:z.string(),senderEmail:z.string().email(),subject:z.string(),message:z.string(),status:z.enum(['new','in_progress','closed']),createdAt:time})),
 accountExport:z.strictObject({profile:privateProfileSchema,papers:page(z.strictObject({id:uuid,title:z.string(),status:z.enum(['pending','approved','rejected','spam']),moduleId:uuid,createdAt:time})),notifications:page(z.strictObject({id:uuid,title:z.string(),message:z.string(),readAt:nullableTime}))}),
};
export function addAdminPaths(paths:Record<string,unknown>,definitions:Record<string,unknown>){
 for(const [name,schema] of Object.entries(outputs))definitions[name]=z.toJSONSchema(schema);
 const inputs:Record<string,z.ZodType>={...Object.fromEntries(Object.entries(adminSchemas).map(([name,schema])=>['admin_'+name,schema])),accountExportQuery:exportSchema,deleteAccount:deleteAccountSchema,adminPagination:catalogSchemas.departments,empty};
 for(const [name,schema] of Object.entries(inputs))definitions[name]=z.toJSONSchema(schema,{io:'input'});
 const add=(path:string,method:string,input:string,output:string,access:'public'|'optional'|'authenticated'|'lecturer'|'admin'='admin',reauth=false,cache=false)=>{
  const s=z.toJSONSchema(inputs[input],{io:'input'}) as {properties?:Record<string,unknown>,required?:string[]};
  const parameters:Array<Record<string,unknown>>=[...path.matchAll(/\{(\w+)\}/g)].map(m=>({name:m[1],in:'path',required:true,schema:{type:'string',format:'uuid'}}));
  if(method==='get')for(const [name,schema] of Object.entries(s.properties||{}))parameters.push({name,in:'query',required:s.required?.includes(name)||false,schema});
  else parameters.push({name:'X-EPapers-Client',in:'header',required:true,schema:{type:'string',const:'web'}});
  if(reauth)parameters.push({name:'X-EPapers-Reauth',in:'header',required:true,schema:{type:'string'},description:'Five-minute password/TOTP proof bound to the active administrator session.'});
  const operation={summary:path,description:(access==='admin'?'Current admin role required. ':access==='lecturer'?'Current lecturer role and verified email required. ':access==='authenticated'?'Current active account/session required. ':access==='optional'?'Optional bearer identity. ':'Public. ')+(reauth?'Reauthentication required inside transaction. ':'')+(cache?'Successful public metadata is cached 60/300 seconds. ':'Cache-Control: no-store. ')+(method!=='get'?'Exact APP_ORIGIN and X-EPapers-Client required. ':''),security:access==='public'?[]:access==='optional'?[{},{bearerAuth:[]}]:[{bearerAuth:[]}],parameters,...(method==='get'?{}:{requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/'+input}}}}}),responses:Object.fromEntries([['200',{description:'Success',content:{'application/json':{schema:{type:'object',required:['data'],additionalProperties:false,properties:{data:{$ref:'#/components/schemas/'+output}}}}}}],...['401','403','404','409','413','422','429','500'].map(code=>[code,{description:'Request rejected or service unavailable',content:{'application/json':{schema:{$ref:'#/components/schemas/error'}}}}])])};
  paths[path]={...(paths[path] as object||{}),[method]:operation};
 };
 add('/admin/users','get','admin_list','adminUsers');add('/admin/users/{id}','get','empty','adminUser');add('/admin/users/{id}','patch','admin_user','adminUser','admin',true);
 for(const path of ['/admin/settings','/admin/security']){add(path,'get','empty',path.endsWith('security')?'securityPolicy':'adminSettings');add(path,'patch','admin_settings','adminSettings','admin',true);}
 add('/settings/public','get','empty','publicSettings','public',false,true);
 add('/admin/audit-logs','get','admin_audit','auditPage');add('/admin/dashboard/stats','get','empty','dashboardStats');
 add('/lecturer/verifications','post','admin_verification','verification','lecturer');add('/admin/lecturer-verifications','get','admin_queue','verificationPage');add('/admin/lecturer-verifications/{id}','patch','admin_verificationReview','verification','admin',true);
 add('/admin/papers/{id}','delete','admin_reason','message','admin',true);add('/admin/papers/{id}/restore','post','admin_reason','message','admin',true);
 for(const [plural,singular,list,detail] of [['departments','department','adminDepartments','adminDepartment'],['programs','program','adminPrograms','adminProgram'],['modules','module','adminModules','adminModule']]){const path='/admin/'+plural;add(path,'get','adminPagination',list);add(path,'post','admin_'+singular,detail);add(path+'/{id}','patch','admin_'+singular+'Patch',detail);add(path+'/{id}','delete','admin_reason','message','admin',true);}
 add('/admin/modules/import','post','admin_csv','importResult');
 add('/admin/health','get','empty','systemHealth');
 add('/admin/announcements','get','adminPagination','announcementPage');add('/admin/announcements','post','admin_announcement','announcement');add('/admin/announcements/{id}','patch','admin_announcementPatch','announcement');add('/admin/announcements/{id}','delete','admin_reason','message','admin',true);add('/announcements/active','get','adminPagination','announcementPage','public',false,true);
 add('/contact-messages','post','admin_contact','receipt','authenticated');add('/admin/contact-messages','get','adminPagination','contactsPage');add('/admin/contact-messages/{id}','patch','admin_contactReview','receipt');
 add('/users/me/export','get','accountExportQuery','accountExport','authenticated');add('/users/me/account','delete','deleteAccount','message','authenticated');
}
