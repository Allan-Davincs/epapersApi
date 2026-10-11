import { NextRequest } from 'next/server';
import { route, preflight } from '@/modules/auth/routes-helpers';
import { schemas } from '@/modules/auth/schemas';
import { revokeSession } from '@/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export async function DELETE(req: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}) { const params = await context.params; return route('auth/sessions/{id}', schemas.empty, async (_d, _req, identity) => revokeSession(identity!.user.id, schemas.session.parse(params).id), true)(req); }
