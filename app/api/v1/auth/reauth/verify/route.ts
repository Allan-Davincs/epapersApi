import { route, preflight } from '@/modules/auth/routes-helpers';
import { schemas } from '@/modules/auth/schemas';
import { verifyAdminReauthentication } from '@/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/reauth/verify', schemas.adminVerify, async (d, _req, identity) => verifyAdminReauthentication(identity!.user.id, identity!.session.id, d.challengeToken, d.code), { roles: ['admin'] });
