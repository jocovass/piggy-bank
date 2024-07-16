import { sql, inArray } from 'drizzle-orm';
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
			set: {
				name: sql.raw(`excluded.${transactions.name}`),
				amount: sql.raw(`excluded.${transactions.amount}`),
				iso_currency_code: sql.raw(
					`excluded.${transactions.iso_currency_code}`,
				),
				unofficial_currency_code: sql.raw(
					`excluded.${transactions.unofficial_currency_code}`,
				),
				payment_channel: sql.raw(`excluded.${transactions.payment_channel}`),
				category: sql.raw(`excluded.${transactions.category}`),
				subcategory: sql.raw(`excluded.${transactions.subcategory}`),
			},
		});
}

export async function deleteTransactions(deletableTransactions: string[]) {
	await db
		.delete(transactions)
		.where(inArray(transactions.plaid_transaction_id, deletableTransactions));
}
