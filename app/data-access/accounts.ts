import { eq } from 'drizzle-orm';
import {
	type ColumnsSelection,
	conflictUpdateSetAllColumns,
} from '~/app/utils/db';
import { type DB, db, type Transaction } from '~/db/index.server';
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

export async function updateAccount({
	id,
	data,
	tx = db,
}: {
	data: Partial<Omit<InsertAccount, 'id'>>;
	id: string;
	tx?: DB;
}) {
	const result = await tx
		.update(accounts)
		.set(data)
		.where(eq(accounts.id, id))
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

export async function getAccountsByBankConnectionId({
	columns,
	bankConnectionId,
	tx = db,
}: {
	columns?: ColumnsSelection<typeof accounts>;
	bankConnectionId: string;
	tx?: DB;
}) {
	const accounts = await tx.query.accounts.findMany({
		columns,
		where: (table, { eq, and }) =>
			and(
				eq(table.bank_connection_id, bankConnectionId),
				eq(table.is_active, true),
			),
	});

	if (!accounts.length) {
		throw new Error('Account does not exist.');
	}

	return accounts;
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
