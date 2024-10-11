import { and, eq, inArray, sql, type SQLWrapper } from 'drizzle-orm';
import { z } from 'zod';
import { conflictUpdateSetAllColumns } from '~/app/utils/db';
import { type DB, db } from '~/db/index.server';
import { transactions, type InsertTransaction } from '~/db/schema';

export const TotalExpenseSchema = z.object({
	date: z.string(),
	amount: z.coerce.number(),
	total_amount: z.coerce.number(),
});

export const StatisticSchema = z.object({
	date: z.string(),
	total_expense: z.coerce.number(),
	total_income: z.coerce.number(),
});

export async function createOrUpdateTransactions({
	plaidTransactions,
	tx = db,
}: {
	plaidTransactions: Omit<InsertTransaction, 'id'>[];
	tx?: DB;
}) {
	if (!plaidTransactions.length) {
		return [];
	}

	const result = await tx
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
		})
		.returning();

	return result;
}

export async function deleteTransactions({
	deletableTransactions,
	tx = db,
}: {
	deletableTransactions: string[];
	tx?: DB;
}) {
	const _db = tx ?? db;
	if (!deletableTransactions.length) {
		return;
	}

	await _db
		.delete(transactions)
		.where(inArray(transactions.plaid_transaction_id, deletableTransactions));
}

export async function getTransactions({
	userId,
	page = 0,
	limit = 30,
	searchTerm,
	tx = db,
}: {
	userId: string;
	limit?: number;
	page?: number;
	searchTerm?: string;
	tx?: DB;
}) {
	const where: SQLWrapper[] = [eq(transactions.is_active, true)];

	if (userId) {
		where.push(eq(transactions.user_id, userId));
	}

	if (searchTerm) {
		where.push(
			sql`${transactions.fts_doc} @@ plainto_tsquery('english', ${searchTerm})`,
		);
	}

	return tx.query.transactions.findMany({
		where: and(...where),
		limit,
		offset: page * limit,
		orderBy: transactions.authorized_date,
	});
}

export async function updateAccountTransactions({
	accountId,
	data,
	tx = db,
}: {
	accountId: string;
	data: Partial<Omit<InsertTransaction, 'id'>>;
	tx?: DB;
}) {
	const result = await tx
		.update(transactions)
		.set(data)
		.where(eq(transactions.account_id, accountId))
		.returning();

	return result;
}

export async function getUserTransactionsForStatisticsCard({
	filter,
	userId,
	tx = db,
}: {
	filter: 'seven_days' | 'thirty_days' | 'year';
	userId: string;
	tx?: DB;
}) {
	let sqlDateRange = sql`(CURRENT_DATE - INTERVAL '29 days')::DATE`;

	if (filter === 'seven_days') {
		sqlDateRange = sql`(CURRENT_DATE - INTERVAL '6 days')::DATE`;
	} else if (filter === 'year') {
		sqlDateRange = sql`(CURRENT_DATE - INTERVAL '365 days')::DATE`;
	}

	const query = sql`
		WITH RECURSIVE dates AS (
	  SELECT ${sqlDateRange} as day
	  UNION ALL
	  SELECT (day + INTERVAL '1 day')::DATE
	  FROM dates
	  WHERE (day + INTERVAL '1 day')::DATE <= CURRENT_DATE
		),
		transactions_summary AS (
			SELECT
					transactions.authorized_date::DATE as authorized_date,
					COALESCE(
						SUM(CASE WHEN transactions.amount > 0 THEN transactions.amount ELSE 0 END),
						0
					) AS expense,
					 COALESCE(
						SUM(CASE WHEN transactions.amount < 0 THEN transactions.amount ELSE 0 END),
						0
					) AS income
			FROM transactions
			WHERE
					transactions.user_id = ${userId}
					AND transactions.authorized_date::DATE >= CURRENT_DATE - INTERVAL '30 days'
					AND transactions.authorized_date::DATE < DATE_TRUNC('day', CURRENT_DATE + INTERVAL '1 day')
			GROUP BY transactions.authorized_date::DATE
		)
		SELECT
			dates.day AS date,
			COALESCE(
				SUM(SUM(transactions_summary.expense)) OVER (ORDER BY dates.day),
				0
			) AS total_expense,
			 COALESCE(
				SUM(SUM(ABS(transactions_summary.income))) OVER (ORDER BY dates.day),
				0
			) AS total_income
		FROM dates
		LEFT JOIN transactions_summary ON transactions_summary.authorized_date = dates.day
		GROUP BY dates.day
		ORDER BY dates.day ASC;
	`;

	const result = await tx.execute(query);
	const data = result.rows.map(row => {
		const parsedData = StatisticSchema.safeParse(row);
		if (parsedData.success) {
			return parsedData.data;
		}
		console.error('Error while parsing statistics data', parsedData.error);
		return null;
	});

	return data;
}
