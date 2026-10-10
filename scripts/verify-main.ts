import { db } from '../src/lib/db';
import { GET } from '../app/api/v1/health/route';
async function main() {
    const counts = { departments: await db.department.count(), programs: await db.program.count(), modules: await db.module.count(), users: await db.user.count(), papers: await db.paper.count() };
    const response = await GET();
    if (response.status !== 200)
        throw new Error('Health endpoint failed');
    if (counts.departments !== 8 || counts.programs !== 36 || counts.modules !== 0 || counts.users !== 0 || counts.papers !== 0)
        throw new Error('Unexpected initial seed counts');
    console.info(JSON.stringify({ healthStatus: response.status, counts }));
}
main().catch(() => { console.error('Main database verification failed'); process.exitCode = 1; }).finally(() => db.$disconnect());
