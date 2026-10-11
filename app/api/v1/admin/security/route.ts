export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { adminSchemas as schemas } from '@/modules/admin/schemas';
import { empty } from '@/modules/catalog/schemas';
import * as service from '@/modules/admin/service';
export const OPTIONS=preflight;
export const GET=route('admin/security',empty,async (_data, _request, identity)=>service.security(identity!.user),{"roles":["admin"],"requireReauth":false},false);
export const PATCH=route('admin/security',schemas.settings,async (data, request, identity)=>service.updateSettings(identity!.user,data,{token:request.headers.get('x-epapers-reauth') || '',sessionId:identity!.session.id}),{"roles":["admin"],"requireReauth":true},false);
