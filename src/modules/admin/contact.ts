import 'server-only';
import { User } from '@prisma/client';
import { z } from 'zod';
import { adminSchemas } from './schemas';
import { db, withTransactionRetry } from '../../lib/db';
import { authorize } from '../auth/service';
import { fail } from '../../lib/errors';
import { adminGuard, audit } from './guard';
import { paging } from './service';
import { page } from '../catalog/service';
export async function contact(input: z.infer<typeof adminSchemas.contact>, user: User) {
    authorize(user, {}); const c = await withTransactionRetry(tx => tx.contactMessage.create({ data: { senderUserId: user?.id, senderName: input.senderName, senderEmail: input.senderEmail, subject: input.subject, message: input.message } })); return { id: c.id, status: c.status }; }
export async function contacts(admin: User, q: {
    cursor?: string;
    limit: number;
}) { authorize(admin, { roles: ['admin'] }); return page(await db.contactMessage.findMany(paging(q)), q.limit, c => ({ id: c.id, senderName: c.senderName, senderEmail: c.senderEmail, subject: c.subject, message: c.message, status: c.status, createdAt: c.createdAt.toISOString() })); }
export async function resolveContact(admin: User, id: string, input: z.infer<typeof adminSchemas.contactReview>) { authorize(admin, { roles: ['admin'] }); await withTransactionRetry(async (tx) => { await adminGuard(tx, admin); if (!await tx.contactMessage.findUnique({ where: { id } }))
    fail(404, 'NOT_FOUND', 'Contact message not found'); await tx.contactMessage.update({ where: { id }, data: { status: input.status } }); await audit(tx, admin.id, 'CONTACT_REVIEWED', 'contact', id, input.reason); }); return { id, status: input.status }; }
