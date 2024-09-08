import { eq } from 'drizzle-orm';
import { db, type DB } from '~/db/index.server';
import { users, type InsertUser } from '~/db/schema';

export async function updateUser({
	userId,
	data,
	tx = db,
}: {
	userId: string;
	data: Partial<Omit<InsertUser, 'id'>>;
	tx?: DB;
}) {
	const user = await tx
		.update(users)
		.set(data)
		.where(eq(users.id, userId))
		.returning();

	return user[0];
}
