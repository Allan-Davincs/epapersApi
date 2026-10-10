import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { errorResponse, json, securityHeaders } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return json({ data: { status: 'ok', database: 'ok', timestamp: new Date().toISOString() } }, 200, securityHeaders());
  } catch (error) {
    logger.error({ err: error }, 'Health check database probe failed');
    return errorResponse('SERVICE_UNAVAILABLE', 'Service is temporarily unavailable', 503);
  }
}
