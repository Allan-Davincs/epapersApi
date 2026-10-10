export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { moderationSchemas as schemas } from '@/modules/moderation/schemas';
import * as service from '@/modules/moderation/service';
import { empty, catalogSchemas } from '@/modules/catalog/schemas';
export const OPTIONS = preflight;
export const GET=route('admin/flags', schemas.queue, async (data, _request, identity) => service.queue(identity!.user,'flags',data), true, false);
