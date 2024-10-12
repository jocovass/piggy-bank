import { eq } from 'drizzle-orm';
import { db, type DB, type Transaction } from '~/db/index.server';
import { users, type InsertUser } from '~/db/schema';

export async function getUser({
	userId,
	tx = db,
}: {
	userId: string;
	tx?: DB | Transaction;
}) {
	const user = await tx.query.users.findFirst({
		where: eq(users.id, userId),
	});

	return user;
}

export async function updateUser({
	userId,
	data,
	tx = db,
}: {
	userId: string;
	data: Partial<Omit<InsertUser, 'id'>>;
	tx?: DB | Transaction;
}) {
	const user = await tx
		.update(users)
		.set(data)
		.where(eq(users.id, userId))
		.returning();

	return user[0];
}

export async function getUserByEmail({
	email,
	tx = db,
}: {
	email: string;
	tx?: DB | Transaction;
}) {
	const user = await tx.query.users.findFirst({
		where: eq(users.email, email),
	});

	return user;
}
