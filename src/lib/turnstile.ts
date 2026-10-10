import 'server-only';
import { env } from './env';
import { fail } from './errors';
export async function verifyTurnstile(token:string) {
 const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:token}),signal:AbortSignal.timeout(10000)});
 const data=await response.json() as {success?:boolean;hostname?:string};
 if(!response.ok || !data.success || data.hostname!==new URL(env.APP_ORIGIN).hostname) fail(422,'CAPTCHA_FAILED','Verification failed');
}
