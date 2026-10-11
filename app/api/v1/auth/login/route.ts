import { route, preflight, sessionResponse } from '@/modules/auth/routes-helpers';
import { schemas } from '@/modules/auth/schemas';
import { login } from '@/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/login', schemas.login, async (d) => {
    const result = await login(d.usernameOrEmail, d.password);
    return 'verificationRequired' in result ? result : sessionResponse(result);
}, false);
