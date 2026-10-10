export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { moderationSchemas as schemas } from '@/modules/moderation/schemas';
import * as service from '@/modules/gamification/service';
import { empty, catalogSchemas } from '@/modules/catalog/schemas';
export const OPTIONS = preflight;
export const GET=route('leaderboard', schemas.leaderboard, async (data, _request, identity) => service.leaderboard(identity!.user,data), true, false);
