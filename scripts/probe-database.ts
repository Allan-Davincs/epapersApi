import { db } from '../src/lib/db';

async function main() {
try {
  await db.$queryRaw`SELECT 1`;
  console.log('Database connection and SELECT 1 verified. No data was changed.');
} catch (error) {
  const message = error instanceof Error ? error.message : '';
  const code = (error as { code?: string; errorCode?: string }).code || (error as { errorCode?: string }).errorCode || 'CONNECTION_FAILED';
  const reason = /no credentials are available in the security package/i.test(message) ? 'WINDOWS_TLS_SANDBOX_ERROR'
    : /authentication failed/i.test(message) ? 'AUTHENTICATION_FAILED'
    : /TLS|SSL|certificate/i.test(message) ? 'TLS_FAILED'
    : /reach|connect|timeout/i.test(message) ? 'CONNECTION_FAILED' : 'DATABASE_FAILED';
  console.error(JSON.stringify({ code, reason }));
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
}
void main();
