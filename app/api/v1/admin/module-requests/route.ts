export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { moderationSchemas as schemas } from '@/modules/moderation/schemas';
import * as service from '@/modules/moderation/service';

export const OPTIONS = preflight;
export const GET=route('admin/module-requests', schemas.queue, async (data, _request, identity) => service.queue(identity!.user,'module-requests',data), true, false);
