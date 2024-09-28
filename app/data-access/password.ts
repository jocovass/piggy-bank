import { conflictUpdateSetAllColumns } from '~/app/utils/db';
import { db, type DB } from '~/db/index.server';
import { type InsertPassword, passwords } from '~/db/schema';

export async function getUserPassword({
	userId,
	tx = db,
}: {
	userId: string;
	tx?: DB;
}) {
	const password = await tx.query.passwords.findFirst({
		where: (fields, { eq }) => eq(fields.userId, userId),
	});
	return password;
}

export async function upsertUserPassword({
	data,
	tx = db,
}: {
	data: Omit<InsertPassword, 'id' | 'createdAt' | 'updatedAt'>;
	tx?: DB;
}) {
	const password = await tx
		.insert(passwords)
		.values(data)
		.onConflictDoUpdate({
			target: passwords.userId,
			set: conflictUpdateSetAllColumns(passwords, ['hash']),
		})
		.returning();

	return password[0];
}
