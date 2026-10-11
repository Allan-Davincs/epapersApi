export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { adminSchemas as schemas } from '@/modules/admin/schemas';
import { catalogSchemas } from '@/modules/catalog/schemas';
import * as service from '@/modules/admin/structure';
export const OPTIONS=preflight;
export const GET=route('admin/programs',catalogSchemas.departments,async (data, _request, identity)=>service.structureList(identity!.user,'programs',data),{"roles":["admin"],"requireReauth":false},false);
export const POST=route('admin/programs',schemas.program,async (data, _request, identity)=>service.saveProgram(identity!.user,data),{"roles":["admin"],"requireReauth":false},false);
