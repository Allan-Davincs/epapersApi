export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { empty } from '@/modules/catalog/schemas';
import * as service from '@/modules/uploads/service';
import { ipHash } from '@/lib/crypto';
export const OPTIONS = preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function POST(req: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const params = await context.params;
    return route('papers/[id]/view', empty, async (_data, request, _identity) => { const id = z.string().uuid().parse(params.id); return service.view(id, ipHash(request.headers.get('cf-connecting-ip') || 'local')); }, "optional", false)(req);
}
