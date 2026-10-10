import { route, preflight } from '@/modules/auth/routes-helpers';
import { schemas } from '@/modules/auth/schemas';
import { resetPassword } from '@/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/reset-password', schemas.reset, async (d) => resetPassword(d.token, d.password), false);
