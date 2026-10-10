export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { uploadSchemas as schemas } from '@/modules/uploads/schemas';
import { empty, catalogSchemas } from '@/modules/catalog/schemas';
import * as service from '@/modules/uploads/service';
export const OPTIONS = preflight;
export const POST=route('uploads/presign', schemas.presign, async (data, _request, identity) => service.presign(identity!.user,data), true, false);
