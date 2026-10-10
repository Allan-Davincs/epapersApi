export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { exportSchema } from '@/modules/accounts/service';

import * as service from '@/modules/accounts/service';
export const OPTIONS=preflight;
export const GET=route('users/me/export',exportSchema,async (data, _request, identity)=>service.exportAccount(identity!.user,data),true,false);
