import { route, preflight } from '@/modules/auth/routes-helpers';
import { schemas } from '@/modules/auth/schemas';
import { updateProfile } from '@/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const PATCH = route('users/me',schemas.profile,async (d,req,identity)=>updateProfile(identity!.user.id,d),true);
