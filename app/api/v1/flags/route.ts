export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { moderationSchemas as schemas } from '@/modules/moderation/schemas';
import * as service from '@/modules/moderation/service';
export const OPTIONS = preflight;
export const POST = route('flags', schemas.flags, async (data, _request, identity) => service.flag(data, identity?.user), "optional", false);
