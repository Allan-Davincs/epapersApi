export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';

import { catalogSchemas } from '@/modules/catalog/schemas';
import * as service from '@/modules/admin/service';
export const OPTIONS=preflight;
export const GET=route('announcements/active',catalogSchemas.departments,async (data, _request, _identity)=>service.activeAnnouncements(data),false,true);
