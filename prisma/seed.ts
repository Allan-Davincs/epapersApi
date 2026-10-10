import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // Curriculum seed content is intentionally left empty until authoritative
  // department/program assignments are confirmed for production.
  console.info('No curriculum seed rows configured.');
}

main().finally(async () => db.$disconnect());
