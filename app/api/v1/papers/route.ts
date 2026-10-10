export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { uploadSchemas as schemas } from '@/modules/uploads/schemas';
import { empty, catalogSchemas } from '@/modules/catalog/schemas';
import * as service from '@/modules/uploads/service';
import * as catalog from '@/modules/catalog/service';
export const OPTIONS = preflight;
export const GET=route('papers', catalogSchemas.papers, async (data, _request, identity) => catalog.papers(data), false, true);
export const POST=route('papers', schemas.create, async (data, _request, identity) => service.createPaper(identity!.user,data), true, false);
