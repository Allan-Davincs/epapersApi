export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { empty } from '@/modules/catalog/schemas';
import * as service from '@/modules/uploads/service';
export const OPTIONS = preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function POST(req: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const params = await context.params;
    return route('uploads/[id]/complete', empty, async (_data, _request, identity) => { const id = z.string().uuid().parse(params.id); return service.complete(identity!.user, id); }, true, false)(req);
}
