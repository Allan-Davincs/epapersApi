import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
const client = new S3Client({ region: 'auto', endpoint: process.env.R2_ENDPOINT, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } });
async function run() {
    for (const key of ['R2_INCOMING_BUCKET', 'R2_PUBLISHED_BUCKET']) {
        try {
            await client.send(new HeadBucketCommand({ Bucket: process.env[key] }));
            console.log(key + ': reachable');
        }
        catch (error) {
            console.log(key + ': unavailable (' + ((error as {
                $metadata?: {
                    httpStatusCode?: number;
                };
            }).$metadata?.httpStatusCode || 'connection/configuration') + ')');
            process.exitCode = 1;
        }
    }
}
run().catch(() => { console.error('R2 probe failed'); process.exitCode = 1; });
