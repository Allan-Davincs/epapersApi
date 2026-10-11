import { route, preflight } from '@/modules/auth/routes-helpers';
import { schemas } from '@/modules/auth/schemas';
import { verifyOtp } from '@/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/verify-otp', schemas.verifyOtp, async (d) => verifyOtp(d.email, d.code), false);
