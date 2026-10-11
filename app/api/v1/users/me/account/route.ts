export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';

import { deleteAccountSchema } from '@/modules/accounts/service';
import * as service from '@/modules/accounts/service';
export const OPTIONS=preflight;
export const DELETE=route('users/me/account',deleteAccountSchema,async (data, _request, identity)=>service.deleteAccount(identity!.user,data.password),true,false);
