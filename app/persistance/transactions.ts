import { inArray } from 'drizzle-orm';
import { conflictUpdateSetAllColumns } from '~/app/utils/db';
import { db, type Transaction } from '~/db/index.server';
import { transactions, type InsertTransaction } from '~/db/schema';

export async function createOrUpdateTransactions(
	plaidTransactions: InsertTransaction[],
	tx?: Transaction,
) {
	const _db = tx ?? db;
	await _db
		.insert(transactions)
		.values(plaidTransactions)
		.onConflictDoUpdate({
			target: transactions.plaid_transaction_id,
			set: conflictUpdateSetAllColumns(transactions, [
				'name',
				'amount',
				'iso_currency_code',
				'unofficial_currency_code',
				'payment_channel',
				'category',
				'subcategory',
			]),
		});
}

export async function deleteTransactions(
	deletableTransactions: string[],
	tx?: Transaction,
) {
	const _db = tx ?? db;
	if (deletableTransactions.length === 0) {
		return;
	}

	await _db
		.delete(transactions)
		.where(inArray(transactions.plaid_transaction_id, deletableTransactions));
}
