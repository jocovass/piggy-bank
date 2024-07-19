import { inArray } from 'drizzle-orm';
import { conflictUpdateSetAllColumns } from '~/app/utils/db';
import { db } from '~/db/index.server';
import { transactions, type InsertTransaction } from '~/db/schema';

export async function createOrUpdateTransactions(
	plaidTransactions: InsertTransaction[],
) {
	await db
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

export async function deleteTransactions(deletableTransactions: string[]) {
	if (deletableTransactions.length === 0) {
		return;
	}

	await db
		.delete(transactions)
		.where(inArray(transactions.plaid_transaction_id, deletableTransactions));
}
