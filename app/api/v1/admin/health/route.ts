import { route, preflight } from '@/modules/auth/routes-helpers';
import { empty } from '@/modules/catalog/schemas';
import { systemHealth } from '@/modules/admin/health';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const GET = route('admin/health', empty, async (_data, _request, identity) => systemHealth(identity!.user), { roles: ['admin'] });
