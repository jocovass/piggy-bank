import { UTCDate } from '@date-fns/utc';
import { eq } from 'drizzle-orm';
import { db } from '~/db/index.server';
import { bankConnections, type InsertBankConnection } from '~/db/schema';

const ninetyDays = 90 * 24 * 60 * 60 * 1000;
export const getConsentExpirationDate = (timestamp?: string | null) => {
	return new UTCDate(timestamp || UTCDate.now() + ninetyDays);
};

export async function createBankConnection(data: InsertBankConnection) {
	const newBankConnection = await db
		.insert(bankConnections)
		.values(data)
		.returning();
	return newBankConnection[0];
}

export async function updatedBankConnection(
	itemId: string,
	{ id, ...data }: Partial<InsertBankConnection>,
) {
	const item = await db
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
