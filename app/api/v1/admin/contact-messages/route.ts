export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';

import { catalogSchemas } from '@/modules/catalog/schemas';
import * as service from '@/modules/admin/contact';
export const OPTIONS=preflight;
export const GET=route('admin/contact-messages',catalogSchemas.departments,async (data, _request, identity)=>service.contacts(identity!.user,data),{"roles":["admin"],"requireReauth":false},false);
