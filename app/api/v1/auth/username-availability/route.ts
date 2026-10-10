import { route, preflight } from '@/modules/auth/routes-helpers';
import { schemas } from '@/modules/auth/schemas';
import { availability } from '@/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const GET = route('auth/username-availability', schemas.availability, async (d) => availability(d.username), false);
