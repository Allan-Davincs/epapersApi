export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { moderationSchemas as schemas } from '@/modules/moderation/schemas';
import * as service from '@/modules/moderation/service';
export const OPTIONS = preflight;
export const POST = route('takedowns', schemas.takedowns, async (data, _request, identity) => service.takedown(data, identity?.user), "optional", false);
