import { route, preflight } from '@/modules/auth/routes-helpers';
import { schemas } from '@/modules/auth/schemas';
import { sessions } from '@/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const GET = route('auth/sessions',schemas.empty,async (d,req,identity)=>sessions(identity!.user.id),true);
