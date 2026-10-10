export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { moderationSchemas as schemas } from '@/modules/moderation/schemas';
import * as service from '@/modules/moderation/service';
import { empty, catalogSchemas } from '@/modules/catalog/schemas';
export const OPTIONS = preflight;
export const POST=route('module-requests', schemas.moduleRequests, async (data, _request, identity) => service.moduleRequest(data,identity?.user), "optional", false);
