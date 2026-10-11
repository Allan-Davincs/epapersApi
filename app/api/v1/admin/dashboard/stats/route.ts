export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';

import { empty } from '@/modules/catalog/schemas';
import * as service from '@/modules/admin/service';
export const OPTIONS=preflight;
export const GET=route('admin/dashboard/stats',empty,async (_data, _request, identity)=>service.stats(identity!.user),{"roles":["admin"],"requireReauth":false},false);
