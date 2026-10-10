export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { adminSchemas as schemas } from '@/modules/admin/schemas';

import * as service from '@/modules/admin/contact';
export const OPTIONS=preflight;
export const POST=route('contact-messages',schemas.contact,async (data, _request, identity)=>service.contact(data,identity?.user),"optional",false);
