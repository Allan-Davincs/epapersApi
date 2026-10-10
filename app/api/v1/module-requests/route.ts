export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { moderationSchemas as schemas } from '@/modules/moderation/schemas';
import * as service from '@/modules/moderation/service';

export const OPTIONS = preflight;
export const POST=route('module-requests', schemas.moduleRequests, async (data, _request, identity) => service.moduleRequest(data,identity?.user), "optional", false);
