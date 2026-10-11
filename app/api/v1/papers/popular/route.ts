export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { catalogSchemas as schemas } from '@/modules/catalog/schemas';
import * as service from '@/modules/catalog/service';
export const OPTIONS = preflight;
export const GET = route('papers/popular', schemas.papers, async (data, _request, _identity) => service.papers({ ...data, sortBy: 'popular' }), false, true);
