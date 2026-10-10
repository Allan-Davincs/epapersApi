export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { empty } from '@/modules/catalog/schemas';

import * as service from '@/modules/accounts/service';
export const OPTIONS=preflight;
export const GET=route('users/me/export',empty,async (_data, _request, identity)=>service.exportAccount(identity!.user),true,false);
