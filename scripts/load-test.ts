import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { db, withTransactionRetry } from '../src/lib/db';
import { papers } from '../src/modules/catalog/service';
import { catalogSchemas } from '../src/modules/catalog/schemas';
import { download } from '../src/modules/uploads/service';
import { env } from '../src/lib/env';
if(!process.env.TEST_DATABASE_URL||new URL(env.DATABASE_URL).pathname!==new URL(process.env.TEST_DATABASE_URL).pathname||!new URL(env.DATABASE_URL).pathname.includes('test'))throw new Error('Use the disposable test database launcher');
const prefix='load_'+randomUUID(),samples:Record<string,number[]>={search:[],download:[]};
let fileId:string|undefined,paperId:string|undefined;
const summarize=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return {requests:values.length,p50Ms:Math.round(sorted[Math.floor(sorted.length*.5)]),p95Ms:Math.round(sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]),maxMs:Math.round(sorted.at(-1)!)};};
async function main(){try{
 const owner=await db.user.findUniqueOrThrow({where:{usernameNormalized:'index_fixture'}}),module=await db.module.findFirstOrThrow({where:{codeNormalized:'plan1'}});
 const fixture={modules:await db.module.count({where:{codeNormalized:{startsWith:'plan'}}}),papers:await db.paper.count({where:{uploadedByUserId:owner.id}})};
 if(fixture.modules<200||fixture.papers<3000)throw new Error('Run test:db to prepare realistic index fixtures');
 const file=await db.storedFile.create({data:{ownerUserId:owner.id,bucketName:env.R2_PUBLISHED_BUCKET,objectKey:prefix+'.pdf',originalFilename:'fixture.pdf',contentType:'application/pdf',sizeBytes:1024n,scanStatus:'CLEAN',completedAt:new Date(),publishedAt:new Date()}});fileId=file.id;
 const paper=await db.paper.create({data:{moduleId:module.id,uploadedByUserId:owner.id,examFileId:file.id,title:'Isolated load fixture',category:'UE',academicYearStart:2025,semester:module.semester,status:'APPROVED'}});paperId=paper.id;
 const warm=await download(paper.id,'exam','load-warmup');let reused=0,errors=0,next=0;
 const concurrency=4,total=80,start=performance.now();
 await Promise.all(Array.from({length:concurrency},async()=>{for(;;){const i=next++;if(i>=total)return;const kind=i%2?'download':'search',t=performance.now();try{if(kind==='search'){const result=await papers(catalogSchemas.papers.parse({q:i%4===0?'plan1':'Index Fixture',sortBy:i%8===0?'popular':'recent',limit:25}));if(!result.items.length)throw new Error('Empty search');}else{const result=await download(paper.id,'exam','load-'+i);if(result.url===warm.url)reused++;}}catch{errors++;}finally{samples[kind].push(performance.now()-t);}}}));
 const elapsedMs=Math.round(performance.now()-start),eventCount=await db.paperDownloadEvent.count({where:{paperId:paper.id}});
 const report={timestamp:new Date().toISOString(),scope:'Service-level concurrency; real CockroachDB and local S3 signing. No HTTP, Cloudflare, R2 bytes, SMTP or Turnstile traffic.',fixture,concurrency,elapsedMs,requestsPerSecond:Number((total/(elapsedMs/1000)).toFixed(2)),errors,search:summarize(samples.search),download:summarize(samples.download),cachedDownloads:reused,eventCount};
 writeFileSync('docs/LOAD-RESULTS.json',JSON.stringify(report,null,2)+'\n');console.info(JSON.stringify(report,null,2));
 if(errors||reused!==40||eventCount!==41)throw new Error('Load correctness checks failed');
 }finally{if(paperId)await withTransactionRetry(async tx=>{await tx.paperDownloadEvent.deleteMany({where:{paperId}});await tx.paper.deleteMany({where:{id:paperId}});});if(fileId)await withTransactionRetry(tx=>tx.storedFile.deleteMany({where:{id:fileId}}));await db.$disconnect();}}
main().catch(()=>{console.error('Load test failed; credentials and signed URLs omitted.');process.exitCode=1;});
