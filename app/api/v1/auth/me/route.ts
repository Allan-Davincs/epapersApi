import { route, preflight } from '@/modules/auth/routes-helpers';
import { schemas } from '@/modules/auth/schemas';
import { privateUser } from '@/modules/auth/dto';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const GET = route('auth/me',schemas.empty,async (d,req,identity)=>privateUser(identity!.user),true);
