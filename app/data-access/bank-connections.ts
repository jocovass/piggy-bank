import { UTCDate } from '@date-fns/utc';
import { eq } from 'drizzle-orm';
import { type ColumnsSelection } from '~/app/utils/db';
import { db, type DB } from '~/db/index.server';
import { bankConnections, type InsertBankConnection } from '~/db/schema';

const ninetyDays = 90 * 24 * 60 * 60 * 1000;
export const getConsentExpirationDate = (timestamp?: string | null) => {
	return new UTCDate(timestamp || UTCDate.now() + ninetyDays);
};

export async function createBankConnection({
	data,
	tx = db,
}: {
	data: InsertBankConnection;
	tx: DB;
}) {
	const newBankConnection = await tx
		.insert(bankConnections)
		.values(data)
		.returning();
	return newBankConnection[0];
}

export async function updateBankConnection({
	bankConnectionId,
	data: { id, ...data },
	tx = db,
}: {
	bankConnectionId: string;
	data: Partial<InsertBankConnection>;
	tx?: DB;
}) {
	const item = await tx
		.update(bankConnections)
		.set(data)
		.where(eq(bankConnections.id, bankConnectionId))
		.returning();

	return item[0];
}

export async function getBankConnectionById({
	columns,
	id,
	tx = db,
}: {
	columns?: ColumnsSelection<typeof bankConnections>;
	id: string;
	tx?: DB;
}) {
	const bankConnection = await tx.query.bankConnections.findFirst({
		columns,
		where: (table, { eq, and }) =>
			and(eq(bankConnections.id, id), eq(table.is_active, true)),
	});

	return bankConnection;
}

export async function getBankConnectionByInstitutionId({
	columns,
	institutionId,
	tx = db,
}: {
	columns?: ColumnsSelection<typeof bankConnections>;
	institutionId: string;
	tx?: DB;
}) {
	const bankConnection = await tx.query.bankConnections.findFirst({
		columns,
		where: (table, { eq, and }) =>
			and(
				eq(bankConnections.plaid_institution_id, institutionId),
				eq(table.is_active, true),
			),
	});

	return bankConnection;
}

export async function getBankConnectionByItemId({
	columns,
	itemId,
	tx = db,
}: {
	columns?: ColumnsSelection<typeof bankConnections>;
	itemId: string;
	tx?: DB;
}) {
	const bankConnection = await tx.query.bankConnections.findFirst({
		columns,
		where: (table, { eq, and }) =>
			and(eq(bankConnections.plaid_item_id, itemId), eq(table.is_active, true)),
	});

	return bankConnection;
}
