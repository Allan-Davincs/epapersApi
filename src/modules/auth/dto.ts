import 'server-only';
import type { User } from '@prisma/client';
import { levelTitleForXp } from '../../lib/levels';
export function privateUser(user:User) { return {id:user.id,username:user.username,email:user.email,fullName:user.fullName,bio:user.bio,avatarId:user.avatarId,role:user.role.toLowerCase(),emailVerified:!!user.emailVerifiedAt,levelTitle:levelTitleForXp(user.xp),joinedAt:user.joinedAt.toISOString()}; }
