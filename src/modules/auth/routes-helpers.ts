import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '../../lib/env';
import { ApiError, fail } from '../../lib/errors';
import { securityHeaders } from '../../lib/http';
import { logger } from '../../lib/logger';
import { rateLimit } from '../../lib/rate-limit';
import { ipHash } from '../../lib/crypto';
import { authenticate } from './service';
type Identity=Awaited<ReturnType<typeof authenticate>>;
export function withAuth(options:{roles?:string[];requireVerifiedEmail?:boolean}={}) {
 return async (req:NextRequest):Promise<Identity> => {
  const bearer=req.headers.get('authorization'); if(!bearer?.startsWith('Bearer ')) fail(401,'UNAUTHORIZED','Authentication required');
  const identity=await authenticate(bearer.slice(7));
  if(options.roles && !options.roles.includes(identity.user.role.toLowerCase())) fail(403,'FORBIDDEN','Access denied');
  if(options.requireVerifiedEmail && !identity.user.emailVerifiedAt) fail(403,'EMAIL_UNVERIFIED','Verify your email first');
  return identity;
 };
}
export function cors(req:NextRequest,response:NextResponse) {
 securityHeaders(response.headers); response.headers.set('Cache-Control','no-store'); response.headers.set('Vary','Origin');
 if(req.headers.get('origin')===env.APP_ORIGIN) { response.headers.set('Access-Control-Allow-Origin',env.APP_ORIGIN); response.headers.set('Access-Control-Allow-Credentials','true'); }
 return response;
}
export function preflight(req:NextRequest) {
 const response=cors(req,new NextResponse(null,{status:req.headers.get('origin')===env.APP_ORIGIN?204:403}));
 response.headers.set('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS'); response.headers.set('Access-Control-Allow-Headers','Content-Type,Authorization,X-EPapers-Client'); return response;
}
export function route<T>(name:string,schema:z.ZodType<T>,action:(data:T,req:NextRequest,identity?:Identity)=>Promise<unknown>,auth=false) {
 return async (req:NextRequest) => {
  const started=Date.now(); const requestId=crypto.randomUUID(); let response:NextResponse;
  try {
   if(req.method!=='GET' && (req.headers.get('origin')!==env.APP_ORIGIN || req.headers.get('x-epapers-client')!=='web')) fail(403,'CSRF_FAILED','Invalid client origin');
   // Trust only the header overwritten by Cloudflare; restrict VPS ingress to Cloudflare in production.
   await rateLimit('ip:'+name+':'+ipHash(req.headers.get('cf-connecting-ip') || 'local'),name==='login'?20:60,900);
   const identity=auth?await withAuth()(req):undefined;
   let raw:unknown;
   if(req.method==='GET') raw=Object.fromEntries(new URL(req.url).searchParams);
   else { const reader=req.body?.getReader(); let size=0; const chunks:Uint8Array[]=[]; if(reader) { while(true) { const {done,value}=await reader.read(); if(done) break; size+=value.byteLength; if(size>16384) { await reader.cancel(); fail(413,'BODY_TOO_LARGE','Request body is too large'); } chunks.push(value); } } try { raw=size?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}; } catch { fail(422,'INVALID_JSON','Invalid JSON'); } }
   const data=schema.parse(raw); const result=await action(data,req,identity);
   response=result instanceof NextResponse?result:NextResponse.json({data:result});
  } catch(error) {
   const code=(error as {code?:string}).code;
   if(error instanceof z.ZodError) response=NextResponse.json({error:{code:'VALIDATION_ERROR',message:'Invalid request',fields:error.issues.map(i=>({path:i.path.join('.'),message:i.message}))}},{status:422});
   else if(error instanceof ApiError) response=NextResponse.json({error:{code:error.code,message:error.message}},{status:error.status});
   else if(code==='P2002' || code==='23505') response=NextResponse.json({error:{code:'CONFLICT',message:'Value is already in use'}},{status:409});
   else { logger.error({err:error,requestId},'Request failed'); response=NextResponse.json({error:{code:'INTERNAL_ERROR',message:'Service is temporarily unavailable'}},{status:500}); }
  }
  logger.info({requestId,method:req.method,route:name,status:response.status,duration:Date.now()-started},'Request completed'); response.headers.set('X-Request-ID',requestId); return cors(req,response);
 };
}
export function sessionResponse(result:{accessToken:string;refreshToken:string;user:unknown;session:{expiresAt:Date}}) {
 const response=NextResponse.json({data:{accessToken:result.accessToken,user:result.user}});
 response.cookies.set('epapers_refresh',result.refreshToken,{httpOnly:true,secure:true,sameSite:'lax',path:'/api/v1/auth',domain:env.COOKIE_DOMAIN,maxAge:Math.max(0,Math.floor((result.session.expiresAt.getTime()-Date.now())/1000))}); return response;
}
export function clearSession() { const response=NextResponse.json({data:{message:'Logged out'}}); response.cookies.set('epapers_refresh','',{httpOnly:true,secure:true,sameSite:'lax',path:'/api/v1/auth',domain:env.COOKIE_DOMAIN,maxAge:0}); return response; }
