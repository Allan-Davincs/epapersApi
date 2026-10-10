import 'server-only';
import { env } from '../env';
export function otpEmail(to:string,code:string) { const text=`Your EPapers verification code is ${code}. It expires in 10 minutes.`; return {to,subject:'Verify your EPapers email',text,html:`<p>${text}</p>`}; }
export function resetEmail(to:string,token:string) { const link=new URL('/reset-password',env.APP_ORIGIN); link.searchParams.set('token',token); const text=`Reset your EPapers password: ${link.toString()}. This link expires in 30 minutes.`; return {to,subject:'Reset your EPapers password',text,html:`<p>${text.replaceAll('&','&amp;')}</p>`}; }
