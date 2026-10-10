import { mkdirSync,writeFileSync } from 'node:fs';
function endpoint(path,methods,imports){const dir='app/api/v1/'+path;mkdirSync(dir,{recursive:true});let code="export const runtime = 'nodejs';\nimport { route,preflight } from '@/modules/auth/routes-helpers';\n"+imports+"\nexport const OPTIONS=preflight;\n";
 if(path.includes('['))code+="import { NextRequest } from 'next/server';\nimport { z } from 'zod';\n";
 for(const [method,schema,action,access='admin',reauth=false,cache=false] of methods){const auth=access==='admin'?{roles:['admin'],requireReauth:reauth}:access==='public'?false:access==='optional'?'optional':true;const args=['data','request','identity'].map(a=>new RegExp('\\b'+a+'\\b').test(action)?a:'_'+a).join(', ');if(path.includes('['))code+=`export async function ${method}(req:NextRequest,context:{params:Promise<{id:string}>}){const params=await context.params;return route('${path}',${schema},async (${args})=>{const id=z.string().uuid().parse(params.id);return ${action};},${JSON.stringify(auth)},${cache})(req);}\n`;else code+=`export const ${method}=route('${path}',${schema},async (${args})=>${action},${JSON.stringify(auth)},${cache});\n`;}
 const body=code.replace(/^import .*$/gm,'');code=code.replace(/import \{ ([^}]+) \} from ([^;]+);/g,(_,names,source)=>{const used=names.split(',').map(n=>n.trim()).filter(n=>new RegExp('\\b'+n.split(' as ').at(-1)+'\\b').test(body));return used.length?'import { '+used.join(', ')+' } from '+source+';':'';});writeFileSync(dir+'/route.ts',code);
}
const imports="import { adminSchemas as schemas } from '@/modules/admin/schemas';\nimport { catalogSchemas,empty } from '@/modules/catalog/schemas';\nimport * as service from '@/modules/admin/service';";
const proof="{token:request.headers.get('x-epapers-reauth') || '',sessionId:identity!.session.id}";
endpoint('admin/users',[['GET','schemas.list','service.users(identity!.user,data)']],imports);
endpoint('admin/users/[id]',[['GET','empty','service.user(identity!.user,id)'],['PATCH','schemas.user',`service.manageUser(identity!.user,id,data,${proof})`,'admin',true]],imports);
for(const name of ['settings','security'])endpoint('admin/'+name,[['GET','empty',`service.${name}(identity!.user)`],['PATCH','schemas.settings',`service.updateSettings(identity!.user,data,${proof})`,'admin',true]],imports);
endpoint('settings/public',[['GET','empty','service.publicSettings()','public',false,true]],imports);
endpoint('admin/dashboard/stats',[['GET','empty','service.stats(identity!.user)']],imports);
endpoint('admin/audit-logs',[['GET','schemas.audit','service.auditLogs(identity!.user,data)']],imports);
endpoint('lecturer/verifications',[['POST','schemas.verification','service.submitVerification(identity!.user,data)','authenticated']],imports);
endpoint('admin/lecturer-verifications',[['GET','schemas.queue','service.verifications(identity!.user,data)']],imports);
endpoint('admin/lecturer-verifications/[id]',[['PATCH','schemas.verificationReview',`service.reviewVerification(identity!.user,id,data,${proof})`,'admin',true]],imports);
// Merge DELETE into the existing detail route instead of replacing GET.
const detailImports=imports.replace("* as service from '@/modules/admin/service'","* as service from '@/modules/moderation/service'")+"\nimport * as admin from '@/modules/admin/service';";
endpoint('admin/papers/[id]',[['GET','empty','service.adminPaper(identity!.user,id)'],['DELETE','schemas.reason',`admin.deletePaper(identity!.user,id,data.reason,${proof})`,'admin',true]],detailImports);
endpoint('admin/papers/[id]/restore',[['POST','schemas.reason',`service.restorePaper(identity!.user,id,data.reason,${proof})`,'admin',true]],imports);
endpoint('admin/announcements',[['GET','catalogSchemas.departments','service.announcements(identity!.user,data)'],['POST','schemas.announcement','service.saveAnnouncement(identity!.user,data)']],imports);
endpoint('admin/announcements/[id]',[['PATCH','schemas.announcementPatch','service.saveAnnouncement(identity!.user,data,id)'],['DELETE','schemas.reason',`service.deleteAnnouncement(identity!.user,id,data.reason,${proof})`,'admin',true]],imports);
endpoint('announcements/active',[['GET','catalogSchemas.departments','service.activeAnnouncements(data)','public',false,true]],imports);
const structure=imports.replace("@/modules/admin/service","@/modules/admin/structure");
for(const [kind,fn,schema] of [['departments','saveDepartment','department'],['programs','saveProgram','program'],['modules','saveModule','module']]){endpoint('admin/'+kind,[['GET','catalogSchemas.departments',`service.structureList(identity!.user,'${kind}',data)`],['POST',`schemas.${schema}`,`service.${fn}(identity!.user,data)`]],structure);endpoint('admin/'+kind+'/[id]',[['PATCH',`schemas.${schema}Patch`,`service.${fn}(identity!.user,data,id)`],['DELETE','schemas.reason',`service.deleteStructure(identity!.user,'${kind}',id,data.reason,${proof})`,'admin',true]],structure);}
endpoint('admin/modules/import',[['POST','schemas.csv','service.importModules(identity!.user,data)']],structure);
const contacts=imports.replace("@/modules/admin/service","@/modules/admin/contact");
endpoint('contact-messages',[['POST','schemas.contact','service.contact(data,identity?.user)','optional']],contacts);
endpoint('admin/contact-messages',[['GET','catalogSchemas.departments','service.contacts(identity!.user,data)']],contacts);
endpoint('admin/contact-messages/[id]',[['PATCH','schemas.contactReview','service.resolveContact(identity!.user,id,data)']],contacts);
const accounts="import { empty } from '@/modules/catalog/schemas';\nimport { z } from 'zod';\nimport * as service from '@/modules/accounts/service';";
endpoint('users/me/export',[['GET','empty','service.exportAccount(identity!.user)','authenticated']],accounts);
endpoint('users/me/account',[['DELETE',"z.strictObject({password:z.string().min(1).max(128)})",'service.deleteAccount(identity!.user,data.password)','authenticated']],accounts);
