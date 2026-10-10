export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';

import * as service from '@/modules/moderation/service';
import { empty } from '@/modules/catalog/schemas';
export const OPTIONS = preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
 const params=await context.params;
 return route('admin/papers/[id]', empty, async (_data, _request, identity) => { const id=z.string().uuid().parse(params.id); return service.adminPaper(identity!.user,id); }, true, false)(req);
}
