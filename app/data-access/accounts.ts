import { and, eq, type SQLWrapper } from 'drizzle-orm';
import {
	type ColumnsSelection,
	conflictUpdateSetAllColumns,
} from '~/app/utils/db';
import { type DB, db, type Transaction } from '~/db/index.server';
import { accounts, type InsertAccount } from '~/db/schema';

export async function createAccounts({
	plaidAccounts,
	tx = db,
}: {
	plaidAccounts: Omit<InsertAccount, 'id'>[];
	tx?: Transaction | DB;
}) {
	if (!plaidAccounts.length) {
		return [];
	}
	const newAccounts = await tx
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
	tx?: DB | Transaction;
}) {
	const result = await tx
		.update(accounts)
		.set(data)
		.where(eq(accounts.id, id))
		.returning();

	return result;
}

export async function getAccounts(userId: string, tx: DB | Transaction = db) {
	const where: SQLWrapper[] = [eq(accounts.is_active, true)];

	if (userId) {
		where.push(eq(accounts.user_id, userId));
	}

	return tx.query.accounts.findMany({
		where: and(...where),
	});
}

export async function getAccountsByBankConnectionId({
	columns,
	bankConnectionId,
	tx = db,
}: {
	columns?: ColumnsSelection<typeof accounts>;
	bankConnectionId: string;
	tx?: DB | Transaction;
}) {
	const accounts = await tx.query.accounts.findMany({
		columns,
		where: (table, { eq, and }) =>
			and(
				eq(table.bank_connection_id, bankConnectionId),
				eq(table.is_active, true),
			),
	});

	return accounts;
}

export async function getAccountsWithBank(
	userId: string,
	tx: DB | Transaction = db,
) {
	const data = await tx.query.accounts.findMany({
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
