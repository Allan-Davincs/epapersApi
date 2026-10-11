import { z } from 'zod';
import { db, withTransactionRetry } from '../src/lib/db';
import { verifyPassword } from '../src/lib/crypto';
const schema=z.strictObject({username:z.string().min(3).max(30),password:z.string().min(1).max(128)});
async function main(){try{
 const input=schema.parse({username:process.env.BOOTSTRAP_USERNAME,password:process.env.BOOTSTRAP_PASSWORD});
 const user=await db.user.findUnique({where:{usernameNormalized:input.username.toLowerCase()}});
 if(!user||user.status!=='ACTIVE'||!user.emailVerifiedAt||!await verifyPassword(user.passwordHash,input.password))throw new Error('Invalid bootstrap account');
 await withTransactionRetry(async tx=>{
  // Serialize competing bootstrap attempts without taking a cluster-wide lock.
  await tx.$queryRaw`SELECT key FROM app_settings WHERE key='lockdown' FOR UPDATE`;
  if(await tx.user.count({where:{role:'ADMIN'}}))throw new Error('Administrator already exists');
  const current=await tx.user.findUniqueOrThrow({where:{id:user.id}});
  if(current.status!=='ACTIVE'||!current.emailVerifiedAt||current.passwordHash!==user.passwordHash)throw new Error('Account changed');
  await tx.user.update({where:{id:user.id},data:{role:'ADMIN'}});
  await tx.userSession.updateMany({where:{userId:user.id},data:{revokedAt:new Date()}});
  await tx.auditLog.create({data:{actorUserId:user.id,action:'ADMIN_BOOTSTRAPPED',targetType:'user',targetId:user.id,reason:'Operator first-admin provisioning'}});
 });console.info('First administrator provisioned:',user.id);
 }finally{await db.$disconnect();}}
main().catch(()=>{console.error('Admin bootstrap refused. Verify local inputs, verified active account, and absence of an existing admin.');process.exitCode=1;});
