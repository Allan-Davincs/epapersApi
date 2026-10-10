export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { moderationSchemas as schemas } from '@/modules/moderation/schemas';
import * as service from '@/modules/moderation/service';

export const OPTIONS = preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
 const params=await context.params;
 return route('admin/module-requests/[id]', schemas.resolveModule, async (data, _request, identity) => { const id=z.string().uuid().parse(params.id); return service.resolveModule(identity!.user,id,data); }, true, false)(req);
}
