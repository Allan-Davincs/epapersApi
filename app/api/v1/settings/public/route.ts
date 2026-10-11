export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';

import { empty } from '@/modules/catalog/schemas';
import * as service from '@/modules/admin/service';
export const OPTIONS=preflight;
export const GET=route('settings/public',empty,async (_data, _request, _identity)=>service.publicSettings(),false,true);
