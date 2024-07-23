import { UTCDate } from '@date-fns/utc';
import { eq } from 'drizzle-orm';
import { db, type Transaction } from '~/db/index.server';
import { bankConnections, type InsertBankConnection } from '~/db/schema';

const ninetyDays = 90 * 24 * 60 * 60 * 1000;
export const getConsentExpirationDate = (timestamp?: string | null) => {
	return new UTCDate(timestamp || UTCDate.now() + ninetyDays);
};

export async function createBankConnection(
	data: InsertBankConnection,
	tx?: Transaction,
) {
	const _db = tx ?? db;
	const newBankConnection = await _db
		.insert(bankConnections)
		.values(data)
		.returning();
	return newBankConnection[0];
}

export async function updatedBankConnection(
	itemId: string,
	{ id, ...data }: Partial<InsertBankConnection>,
	tx?: Transaction,
) {
	const _db = tx ?? db;
	const item = await _db
		.update(bankConnections)
		.set(data)
		.where(eq(bankConnections.plaid_item_id, itemId))
		.returning();

	return item[0];
}

export async function getBankConnectionByItemId(itemId: string) {
	const bankConnection = await db.query.bankConnections.findFirst({
		columns: { access_token: true, transaction_cursor: true },
		where: eq(bankConnections.plaid_item_id, itemId),
	});

	if (!bankConnection) {
		throw new Error('Bank connection does not exist.');
	}

	return bankConnection;
}

export async function getBankConnections(userId: string, tx?: Transaction) {
	const _db = tx ?? db;
	const data = await _db.query.bankConnections.findMany({
		where: (bankConnection, { eq }) => eq(bankConnection.user_id, userId),
	});

	return data;
}
