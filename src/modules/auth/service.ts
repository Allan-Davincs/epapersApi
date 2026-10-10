import 'server-only';
import { encrypt,decrypt } from '../../lib/encryption';
import { randomUUID } from 'node:crypto';
import type { Prisma, User } from '@prisma/client';
import { db, withTransactionRetry } from '../../lib/db';
import { fail } from '../../lib/errors';
import { hashPassword, verifyPassword, opaqueToken, tokenHash, otp, verifyTotp } from '../../lib/crypto';
import { signAccess, verifyAccess } from '../../lib/jwt';
import { rateLimit } from '../../lib/rate-limit';
import { verifyTurnstile } from '../../lib/turnstile';
import { otpEmail, resetEmail } from '../../lib/email/templates';
import { privateUser } from './dto';
import { audit, challenge } from './repository';
const generic={message:'If eligible, an email will be sent. Delivery may be delayed.'};
async function lockUser(tx:Prisma.TransactionClient,id:string) { await tx.$queryRaw`SELECT id FROM users WHERE id=${id}::UUID FOR UPDATE`; }
function active(user:User|null): asserts user is User { if(!user || user.deletedAt || user.status!=='ACTIVE') fail(401,'UNAUTHORIZED','Authentication required'); }
async function enqueue(tx:Prisma.TransactionClient,message:ReturnType<typeof otpEmail>,priority=false) { await tx.job.create({data:{type:priority?'email_otp':'email',payload:{encrypted:encrypt(message,'email')}}}); }
async function newChallenge(tx:Prisma.TransactionClient,user:User,kind:'otp'|'reset') {
 const token=kind==='otp'?otp():opaqueToken();
 await tx.$executeRaw`UPDATE auth_challenges SET consumed_at=now() WHERE user_id=${user.id}::UUID AND kind=${kind} AND consumed_at IS NULL`;
 await tx.$executeRaw`INSERT INTO auth_challenges(user_id,kind,token_hash,expires_at) VALUES (${user.id}::UUID,${kind},${tokenHash(token)},${new Date(Date.now()+(kind==='otp'?600000:1800000))})`;
 await enqueue(tx,kind==='otp'?otpEmail(user.email,token):resetEmail(user.email,token),kind==='otp');
}
export async function register(input:{username:string;email:string;password:string;fullName:string;turnstileToken:string;role?:'contributor'|'lecturer'}) {
 await rateLimit('register-email:'+tokenHash(input.email),5,3600); await verifyTurnstile(input.turnstileToken);
 const passwordHash=await hashPassword(input.password);
 return withTransactionRetry(async tx=> {
  const settings=await tx.$queryRaw<Array<{value:unknown}>>`SELECT value FROM app_settings WHERE key='lockdown'`;
  if(settings[0]?.value===true) fail(403,'LOCKDOWN','Registration is temporarily disabled');
  const existing=await tx.user.findUnique({where:{emailNormalized:input.email}}); if(existing) return generic;
  const reserved=await tx.$queryRaw<Array<{username_normalized:string}>>`SELECT username_normalized FROM username_registry WHERE username_normalized=${input.username.toLowerCase()}`;
  if(reserved.length) fail(409,'USERNAME_TAKEN','Username is unavailable');
  const user=await tx.user.create({data:{username:input.username,usernameNormalized:input.username.toLowerCase(),email:input.email,emailNormalized:input.email,fullName:input.fullName,passwordHash,role:input.role==='lecturer'?'LECTURER':'CONTRIBUTOR'}});
  await tx.$executeRaw`INSERT INTO username_registry(username_normalized,user_id) VALUES (${user.usernameNormalized},${user.id}::UUID)`;
  await newChallenge(tx,user,'otp'); await audit(tx,user.id,'REGISTER'); return generic;
 });
}
export async function resend(email:string,kind:'otp'|'reset',turnstileToken?:string) {
 await rateLimit(kind+'-email:'+tokenHash(email),5,3600);
 if(kind==='reset') await verifyTurnstile(turnstileToken!);
 return withTransactionRetry(async tx=> {
  const user=await tx.user.findUnique({where:{emailNormalized:email}});
  if(!user || user.deletedAt || user.status!=='ACTIVE' || (kind==='otp' && user.emailVerifiedAt)) return generic;
  await lockUser(tx,user.id); const previous=await challenge(tx,user.id,kind);
  if(previous && Date.now()-previous.created_at.getTime()<60000) return generic;
  await newChallenge(tx,user,kind); return generic;
 });
}
export async function verifyOtp(email:string,code:string) {
 await rateLimit('otp-email:'+tokenHash(email),10,600);
 const result=await withTransactionRetry(async tx=> {
  const user=await tx.user.findUnique({where:{emailNormalized:email}});
  if(!user || user.deletedAt || user.status!=='ACTIVE') return false;
  await lockUser(tx,user.id); const c=await challenge(tx,user.id,'otp');
  if(!c || c.consumed_at || c.expires_at<=new Date() || c.attempts>=5) return false;
  await tx.$executeRaw`UPDATE auth_challenges SET attempts=attempts+1 WHERE id=${c.id}::UUID`;
  if(c.token_hash!==tokenHash(code)) return false;
  await tx.$executeRaw`UPDATE auth_challenges SET consumed_at=now() WHERE id=${c.id}::UUID`;
  await tx.user.update({where:{id:user.id},data:{emailVerifiedAt:new Date()}}); return true;
 });
 if(!result) fail(422,'INVALID_CODE','Code is invalid or expired'); return {message:'Email verified'};
}
async function issueSession(tx:Prisma.TransactionClient,user:User,familyId:string=randomUUID()) {
 const refreshToken=opaqueToken(); const session=await tx.userSession.create({data:{userId:user.id,familyId,refreshTokenHash:tokenHash(refreshToken),expiresAt:new Date(Date.now()+(user.role==='ADMIN'?3600000:30*86400000))}});
 return {session,refreshToken};
}
export async function login(usernameOrEmail:string,password:string,totp?:string) {
 const email=usernameOrEmail.toLowerCase();
 await rateLimit('login-email:'+tokenHash(email),10,900);
 const user=await db.user.findFirst({where:{OR:[{emailNormalized:email},{usernameNormalized:email}]}});
 if(user) await rateLimit('login-account:'+user.id,10,900);
 // Burn the same Argon2 work for unknown accounts to reduce account enumeration.
 const ok=user ? await verifyPassword(user.passwordHash,password) : (await hashPassword(opaqueToken()),false);
 if(!ok) fail(401,'INVALID_CREDENTIALS','Invalid credentials'); active(user);
 if(user.role==='ADMIN') { if(!totp || !user.totpSecret || !verifyTotp(decrypt<string>(user.totpSecret,'totp'),totp)) fail(401,'INVALID_CREDENTIALS','Invalid credentials'); }
 else if(totp!==undefined) fail(403,'FORBIDDEN','Admin account required');
 const issued=await withTransactionRetry(async tx=> { await lockUser(tx,user.id); const current=await tx.user.findUnique({where:{id:user.id}}); active(current); if(current.passwordHash!==user.passwordHash || current.role!==user.role || current.totpSecret!==user.totpSecret) fail(401,'INVALID_CREDENTIALS','Please log in again'); return issueSession(tx,current); });
 return {...issued,accessToken:await signAccess(user,issued.session.id),user:privateUser(user)};
}
export async function refresh(token:string) {
 const result=await withTransactionRetry(async tx=> {
  const session=await tx.userSession.findUnique({where:{refreshTokenHash:tokenHash(token)}});
  if(!session) return null;
  await lockUser(tx,session.userId);
  const current=await tx.userSession.findUnique({where:{id:session.id}});
  if(!current) return null;
  if(current.rotatedAt) { await tx.userSession.updateMany({where:{familyId:current.familyId},data:{revokedAt:new Date()}}); return null; }
  if(current.revokedAt || current.expiresAt<=new Date()) return null;
  const user=await tx.user.findUnique({where:{id:current.userId}});
  if(!user || user.deletedAt || user.status!=='ACTIVE') { await tx.userSession.updateMany({where:{userId:current.userId},data:{revokedAt:new Date()}}); return null; }
  await tx.userSession.update({where:{id:current.id},data:{rotatedAt:new Date(),revokedAt:new Date()}});
  const next=await issueSession(tx,user,current.familyId);
  // Refresh does not extend the session family's absolute expiry (especially admins).
  await tx.userSession.update({where:{id:next.session.id},data:{expiresAt:current.expiresAt}});
  next.session.expiresAt=current.expiresAt;
  return {...next,user};
 });
 if(!result) fail(401,'INVALID_SESSION','Please log in again');
 return {...result,accessToken:await signAccess(result.user,result.session.id),user:privateUser(result.user)};
}
export async function authenticate(token:string) {
 let claims; try { claims=await verifyAccess(token); } catch { fail(401,'UNAUTHORIZED','Authentication required'); }
 if(typeof claims.sid!=='string' || typeof claims.sub!=='string') fail(401,'UNAUTHORIZED','Authentication required');
 const session=await db.userSession.findUnique({where:{id:claims.sid},include:{user:true}});
 if(!session || session.revokedAt || session.rotatedAt || session.expiresAt<=new Date() || session.userId!==claims.sub) fail(401,'UNAUTHORIZED','Authentication required');
 active(session.user); if(session.user.role.toLowerCase()!==claims.role) fail(401,'UNAUTHORIZED','Please log in again');
 return {user:session.user,session};
}
export async function logout(token:string) { await withTransactionRetry(async tx=> { const session=await tx.userSession.findUnique({where:{refreshTokenHash:tokenHash(token)}}); if(session) { await lockUser(tx,session.userId); await tx.userSession.updateMany({where:{familyId:session.familyId},data:{revokedAt:new Date()}}); } }); return {message:'Logged out'}; }
export async function resetPassword(token:string,password:string) {
 const passwordHash=await hashPassword(password);
 const ok=await withTransactionRetry(async tx=> {
  const rows=await tx.$queryRaw<Array<{user_id:string}>>`SELECT user_id FROM auth_challenges WHERE token_hash=${tokenHash(token)} AND kind='reset' LIMIT 1`;
  if(!rows[0]) return false; await lockUser(tx,rows[0].user_id);
  const c=await challenge(tx,rows[0].user_id,'reset'); const user=await tx.user.findUnique({where:{id:rows[0].user_id}});
  if(!c || c.token_hash!==tokenHash(token) || c.consumed_at || c.expires_at<=new Date() || !user || user.deletedAt || user.status!=='ACTIVE') return false;
  await tx.$executeRaw`UPDATE auth_challenges SET consumed_at=now() WHERE id=${c.id}::UUID`;
  await tx.user.update({where:{id:user.id},data:{passwordHash}}); await tx.userSession.updateMany({where:{userId:user.id},data:{revokedAt:new Date()}}); await audit(tx,user.id,'PASSWORD_RESET'); return true;
 }); if(!ok) fail(422,'INVALID_TOKEN','Reset link is invalid or expired'); return {message:'Password reset'};
}
export async function availability(username:string) { const rows=await db.$queryRaw<Array<{username_normalized:string}>>`SELECT username_normalized FROM username_registry WHERE username_normalized=${username.toLowerCase()}`; return {available:rows.length===0}; }
export async function updateProfile(userId:string,input:{username?:string;fullName?:string;bio?:string;avatarId?:string|null}) {
 return withTransactionRetry(async tx=> {
  await lockUser(tx,userId); const user=await tx.user.findUnique({where:{id:userId}}); active(user);
  if(input.username && input.username.toLowerCase()!==user.usernameNormalized) {
   const settings=await tx.$queryRaw<Array<{value:number}>>`SELECT value FROM app_settings WHERE key='usernameCooldownDays'`;
   const days=settings[0]?.value ?? 30;
   if(user.usernameChangedAt && Date.now()-user.usernameChangedAt.getTime()<days*86400000) fail(409,'USERNAME_COOLDOWN','Username change cooldown is active');
   const taken=await tx.$queryRaw<Array<{user_id:string}>>`SELECT user_id FROM username_registry WHERE username_normalized=${input.username.toLowerCase()}`;
   if(taken.length) fail(409,'USERNAME_TAKEN','Username is unavailable');
   await tx.$executeRaw`UPDATE username_registry SET is_current=false,retired_at=now() WHERE user_id=${userId}::UUID AND is_current`;
   await tx.$executeRaw`INSERT INTO username_registry(username_normalized,user_id) VALUES (${input.username.toLowerCase()},${userId}::UUID)`;
   await tx.user.update({where:{id:userId},data:{username:input.username,usernameNormalized:input.username.toLowerCase(),usernameChangedAt:new Date()}}); await audit(tx,userId,'USERNAME_CHANGED');
  }
  const updated=await tx.user.update({where:{id:userId},data:{fullName:input.fullName,bio:input.bio,avatarId:input.avatarId}}); return privateUser(updated);
 });
}
export async function sessions(userId:string) { return (await db.userSession.findMany({where:{userId,revokedAt:null,rotatedAt:null,expiresAt:{gt:new Date()}},orderBy:{createdAt:'desc'},take:100})).map(s=>({id:s.id,createdAt:s.createdAt.toISOString(),expiresAt:s.expiresAt.toISOString()})); }
export async function revokeSession(userId:string,id:string) { await withTransactionRetry(async tx=>{ await lockUser(tx,userId); const s=await tx.userSession.findFirst({where:{id,userId}}); if(!s) fail(404,'NOT_FOUND','Session not found'); await tx.userSession.updateMany({where:{userId,familyId:s.familyId},data:{revokedAt:new Date()}}); }); return {message:'Session revoked'}; }

export async function logoutAll(userId:string) { await withTransactionRetry(async tx=>{ await lockUser(tx,userId); await tx.userSession.updateMany({where:{userId},data:{revokedAt:new Date()}}); await audit(tx,userId,'LOGOUT_ALL'); }); return {message:'All sessions revoked'}; }
