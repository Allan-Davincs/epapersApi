import { db } from '../src/lib/db';
import { logger } from '../src/lib/logger';

async function run() {
  logger.info('EPapers worker started; no jobs are currently registered.');
  await db.$disconnect();
}

run().catch((error: unknown) => {
  logger.error({ err: error }, 'Worker startup failed');
  process.exitCode = 1;
});
