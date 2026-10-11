import { S3Client, GetBucketCorsCommand, PutBucketCorsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

const origin = new URL(process.env.APP_ORIGIN).origin;
const bucket = process.env.R2_INCOMING_BUCKET;
const client = new S3Client({ region: 'auto', endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
try {
  if (process.argv.includes('--apply')) {
    let rules = [];
    try { rules = (await client.send(new GetBucketCorsCommand({ Bucket: bucket }))).CORSRules || []; }
    catch (error) { if (error.name !== 'NoSuchCORSConfiguration') throw error; }
    const id = 'epapers-browser-upload';
    const rule = { ID: id, AllowedOrigins: [origin], AllowedMethods: ['PUT'],
      AllowedHeaders: ['Content-Type', 'Content-Length', 'If-None-Match'], ExposeHeaders: ['ETag'], MaxAgeSeconds: 300 };
    await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: {
      CORSRules: [...rules.filter(item => item.ID !== id), rule],
    } }));
    console.info('Applied incoming upload CORS; other rules were retained.');
  }
  const url = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket,
    Key: `incoming/cors-probe-${randomUUID()}.pdf`, ContentType: 'application/pdf', ContentLength: 1, IfNoneMatch: '*' }),
  { expiresIn: 300, signableHeaders: new Set(['content-type', 'content-length', 'if-none-match']) });
  const response = await fetch(url, { method: 'OPTIONS', headers: { Origin: origin,
    'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'content-type,if-none-match' }, signal: AbortSignal.timeout(20000) });
  const allowedOrigin = response.headers.get('access-control-allow-origin');
  const methods = (response.headers.get('access-control-allow-methods') || '').toUpperCase().split(',').map(s => s.trim());
  const headers = (response.headers.get('access-control-allow-headers') || '').toLowerCase().split(',').map(s => s.trim());
  const ok = response.ok && (allowedOrigin === origin || allowedOrigin === '*') && methods.includes('PUT') &&
    (headers.includes('*') || ['content-type', 'if-none-match'].every(h => headers.includes(h)));
  console.info(`Upload preflight for ${origin}: HTTP ${response.status}, ${ok ? 'PASS' : 'FAIL'}. No object was uploaded.`);
  if (!ok) process.exitCode = 1;
} catch (error) {
  console.error(`R2 CORS operation failed (${error.name || 'connection error'}, HTTP ${error.$metadata?.httpStatusCode || 'unavailable'}). Credentials and signed URLs were not printed.`);
  process.exitCode = 1;
} finally { client.destroy(); }
