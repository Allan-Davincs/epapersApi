import { db,withTransactionRetry } from '../src/lib/db';
import { logger } from '../src/lib/logger';
import { emailProvider,EmailMessage } from '../src/lib/email/provider';
import { env } from '../src/lib/env';
let stopping=false;
process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});
async function tick() {
 const job=await withTransactionRetry(async tx=> {
  const candidate=await tx.job.findFirst({where:{type:{in:['email_otp','email']},runAt:{lte:new Date()},status:'pending'},orderBy:[{type:'desc'},{runAt:'asc'}]});
  if(!candidate) return null;
  const claimed=await tx.job.updateMany({where:{id:candidate.id,status:'pending'},data:{status:'running',runAt:new Date(Date.now()+60000),attempts:{increment:1}}});
  if(!claimed.count) return null; return candidate;
 });
 if(!job) return;
 try {
  if(env.EMAIL_PROVIDER==='smtp') {
   const allowed=await withTransactionRetry(async tx=> { const rows=await tx.$queryRaw<Array<{sent:number}>>`INSERT INTO email_daily_counters(day,sent) VALUES (current_date,1) ON CONFLICT(day) DO UPDATE SET sent=email_daily_counters.sent+1 RETURNING sent`; return rows[0].sent<=env.SMTP_DAILY_LIMIT; });
   if(!allowed) { await withTransactionRetry(tx=>tx.job.update({where:{id:job.id},data:{status:'pending',runAt:new Date(Date.now()+3600000)}})); return; }
  }
  // Prevent delivery of OTP/reset messages after their validity window.
  const expired=Date.now()-job.createdAt.getTime()>(job.type==='email_otp'?600000:1800000);
  if(!expired) await emailProvider.send(job.payload as unknown as EmailMessage);
  await withTransactionRetry(tx=>tx.job.update({where:{id:job.id},data:{status:expired?'expired':'done',lastError:null}}));
 } catch {
  await withTransactionRetry(tx=>tx.job.update({where:{id:job.id},data:{status:job.attempts>=7?'failed':'pending',runAt:new Date(Date.now()+Math.min(3600000,1000*2**job.attempts)),lastError:'Email delivery failed'}}));
 }
}
async function run() {
 while(!stopping) {
  await withTransactionRetry(async tx=> { await tx.job.updateMany({where:{status:'running',type:{in:['email_otp','email']},runAt:{lt:new Date()}},data:{status:'pending'}}); await tx.$executeRaw`DELETE FROM rate_limit_counters WHERE expires_at < now()`; });
  await tick(); await new Promise(resolve=>setTimeout(resolve,1000));
 }
 await db.$disconnect();
}
run().catch(()=>{logger.error('Worker failed');process.exitCode=1;});
