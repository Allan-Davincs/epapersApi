export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { uploadSchemas as schemas } from '@/modules/uploads/schemas';
import { empty, catalogSchemas } from '@/modules/catalog/schemas';
import * as service from '@/modules/uploads/service';
export const OPTIONS = preflight;
export const GET=route('users/me/papers', catalogSchemas.departments, async (data, _request, identity) => service.myPapers(identity!.user,data), true, false);
