export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';

import { z } from 'zod';
import * as service from '@/modules/accounts/service';
export const OPTIONS=preflight;
export const DELETE=route('users/me/account',z.strictObject({password:z.string().min(1).max(128)}),async (data, _request, identity)=>service.deleteAccount(identity!.user,data.password),true,false);
