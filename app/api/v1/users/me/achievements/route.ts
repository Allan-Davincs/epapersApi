export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';

import * as service from '@/modules/gamification/service';
import { empty } from '@/modules/catalog/schemas';
export const OPTIONS = preflight;
export const GET=route('users/me/achievements', empty, async (_data, _request, identity) => service.achievements(identity!.user), true, false);
