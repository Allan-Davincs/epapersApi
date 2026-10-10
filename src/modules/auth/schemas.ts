import 'server-only';
import { z } from 'zod';
export const username=z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/);
const email=z.string().trim().email().max(254).transform(v=>v.toLowerCase());
const password=z.string().min(10).max(128);
export const schemas={
 register:z.strictObject({username,email,password,role:z.enum(['contributor','lecturer']).default('contributor'),fullName:z.string().trim().min(2).max(160),turnstileToken:z.string().min(1).max(2048)}),
 login:z.strictObject({usernameOrEmail:z.string().trim().min(3).max(254),password:z.string().min(1).max(128)}),
 reauth:z.strictObject({password:z.string().min(1).max(128),totp:z.string().regex(/^\d{6}$/)}),
 adminLogin:z.strictObject({usernameOrEmail:z.string().trim().min(3).max(254),password:z.string().min(1).max(128),totp:z.string().regex(/^\d{6}$/)}),
 verifyOtp:z.strictObject({email,code:z.string().regex(/^\d{6}$/)}),
 resend:z.strictObject({email}),
 forgot:z.strictObject({email,turnstileToken:z.string().min(1).max(2048)}),
 reset:z.strictObject({token:z.string().min(20).max(128),password}),
 profile:z.strictObject({username:username.optional(),fullName:z.string().trim().min(2).max(160).optional(),bio:z.string().max(1000).optional(),avatarId:z.string().regex(/^[a-z0-9_-]{1,32}$/).nullable().optional()}),
 availability:z.strictObject({username}),
 empty:z.strictObject({}),
 session:z.strictObject({id:z.uuid()})
};

export const privateProfileSchema=z.strictObject({id:z.uuid(),username:z.string(),email:z.email(),fullName:z.string(),bio:z.string(),avatarId:z.string().nullable(),role:z.enum(['contributor','lecturer','admin']),emailVerified:z.boolean(),levelTitle:z.string(),joinedAt:z.iso.datetime()});
export const sessionSchema=z.strictObject({id:z.uuid(),createdAt:z.iso.datetime(),expiresAt:z.iso.datetime()});
export const responseSchemas={reauth:z.strictObject({reauthToken:z.string()}),profile:privateProfileSchema,sessionList:z.array(sessionSchema),tokens:z.strictObject({accessToken:z.string(),user:privateProfileSchema}),message:z.strictObject({message:z.string()}),availability:z.strictObject({available:z.boolean()}),error:z.strictObject({error:z.strictObject({code:z.string(),message:z.string(),fields:z.array(z.strictObject({path:z.string(),message:z.string()})).optional()})})};
