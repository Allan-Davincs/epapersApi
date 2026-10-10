import 'server-only';
import { User } from '@prisma/client';
import { TransactionClient } from '../../lib/db';
import { authorize } from '../auth/service';
import { verifyReauthentication } from '../../lib/jwt';
import { fail } from '../../lib/errors';
export interface AdminProof {token:string;sessionId:string}
export async function adminGuard(tx:TransactionClient,user:User,proof?:AdminProof){
 const current=await tx.user.findUnique({where:{id:user.id}});if(!current)fail(401,'UNAUTHORIZED','Authentication required');authorize(current,{roles:['admin']});
 if(proof){let claims;try{claims=await verifyReauthentication(proof.token);}catch{fail(401,'REAUTH_REQUIRED','Reauthentication required');}
  if(claims.sub!==user.id || claims.sid!==proof.sessionId)fail(401,'REAUTH_REQUIRED','Reauthentication required');
  if(!await tx.userSession.findFirst({where:{id:proof.sessionId,userId:user.id,revokedAt:null,rotatedAt:null,expiresAt:{gt:new Date()}}}))fail(401,'UNAUTHORIZED','Authentication required');
 }
}
export function requireProof(proof?:AdminProof):AdminProof{if(!proof)fail(401,'REAUTH_REQUIRED','Reauthentication required');return proof;}
export async function audit(tx:TransactionClient,userId:string,action:string,targetType:string,targetId:string|null,reason:string){await tx.auditLog.create({data:{actorUserId:userId,action,targetType,targetId,reason}});}
