import { route, preflight, sessionResponse } from '@/modules/auth/routes-helpers';
import { schemas } from '@/modules/auth/schemas';
import { verifyAdminLogin } from '@/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/admin/verify-login', schemas.adminVerify, async d => sessionResponse(await verifyAdminLogin(d.challengeToken, d.code)));
