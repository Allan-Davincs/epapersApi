import { route, preflight } from '@/modules/auth/routes-helpers';
import { schemas } from '@/modules/auth/schemas';
import { resend } from '@/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/forgot-password', schemas.forgot, async (d) => resend(d.email, 'reset', d.turnstileToken), false);
