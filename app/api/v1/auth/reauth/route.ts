import { route, preflight } from '@/modules/auth/routes-helpers';
import { schemas } from '@/modules/auth/schemas';
import { reauthenticate } from '@/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/reauth', schemas.reauth, async (d, _req, identity) => reauthenticate(identity!.user.id, identity!.session.id, d.password), { roles: ['admin'] });
