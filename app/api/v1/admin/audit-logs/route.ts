export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { adminSchemas as schemas } from '@/modules/admin/schemas';

import * as service from '@/modules/admin/service';
export const OPTIONS=preflight;
export const GET=route('admin/audit-logs',schemas.audit,async (data, _request, identity)=>service.auditLogs(identity!.user,data),{"roles":["admin"],"requireReauth":false},false);
