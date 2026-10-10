export const runtime = 'nodejs';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { moderationSchemas as schemas } from '@/modules/moderation/schemas';
import * as service from '@/modules/gamification/service';
export const OPTIONS = preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function PATCH(req: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const params = await context.params;
    return route('notifications/[id]', schemas.readNotification, async (_data, _request, identity) => { const id = z.string().uuid().parse(params.id); return service.readNotification(identity!.user, id); }, true, false)(req);
}
