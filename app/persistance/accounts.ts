import { eq } from 'drizzle-orm';
import { conflictUpdateSetAllColumns } from '~/app/utils/db';
import { db, type Transaction } from '~/db/index.server';
import { accounts, type InsertAccount } from '~/db/schema';

export async function createAccounts(
	plaidAccounts: InsertAccount[],
	tx?: Transaction,
) {
	const _db = tx ?? db;
	const newAccounts = await _db
		.insert(accounts)
		.values(plaidAccounts)
		.onConflictDoUpdate({
			target: accounts.plaid_account_id,
			set: conflictUpdateSetAllColumns(accounts, ['name', 'current_balance']),
		})
		.returning();

	return newAccounts;
}

export async function updateAccount(
	bankConnectionId: string,
	{ id, ...data }: Partial<InsertAccount>,
	tx?: Transaction,
) {
	const _db = tx ?? db;
	const result = await _db
		.update(accounts)
		.set(data)
		.where(eq(accounts.bank_connection_id, bankConnectionId))
		.returning();

	return result;
}

export async function getAccounts(userId: string, tx?: Transaction) {
	const _db = tx ?? db;
	const data = await _db.query.accounts.findMany({
		where: (account, { eq }) => eq(account.user_id, userId),
	});

	return data;
}

export async function getAccountsWithBank(userId: string, tx?: Transaction) {
	const _db = tx ?? db;
	const data = await _db.query.accounts.findMany({
		where: (account, { eq, and }) =>
			and(eq(account.user_id, userId), eq(account.is_active, true)),

		with: {
			bankConnection: {
				columns: {
					id: true,
					logo: true,
					name: true,
					primary_color: true,
				},
			},
		},
	});

	return data;
}
