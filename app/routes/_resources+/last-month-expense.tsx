// import { UTCDate } from '@date-fns/utc';
import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { sql } from 'drizzle-orm';
import { useEffect, useMemo } from 'react';
import {
	Label,
	PolarGrid,
	PolarRadiusAxis,
	RadialBar,
	RadialBarChart,
} from 'recharts';
import { z } from 'zod';
import { Card, CardContent } from '~/app/components/ui/card';
import { type ChartConfig, ChartContainer } from '~/app/components/ui/chart';
import { requireUser } from '~/app/utils/auth.server';
import { formatCurrency } from '~/app/utils/format-currency';
import { db } from '~/db/index.server';

const ResponseSchema = z.object({
	date: z.string(),
	amount: z.coerce.number(),
	total_amount: z.coerce.number(),
});
export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request);
	const statement = sql`
    WITH RECURSIVE dates AS (
      SELECT DATE_TRUNC('month', CURRENT_DATE)::DATE as day
      UNION ALL
      SELECT (day + INTERVAL '1 day')::DATE
      FROM dates
      WHERE (day + INTERVAL '1 day')::DATE < CURRENT_DATE + INTERVAL '1 day'
    ),
    expenses AS (
      SELECT
        transactions.authorized_date::DATE,
        COALESCE(SUM(transactions.amount), 0) as amount
      FROM transactions
      WHERE
        transactions.user_id = ${user.id}
        AND transactions.amount > 0
        AND transactions.authorized_date::DATE >= DATE_TRUNC('month', CURRENT_DATE)
        AND transactions.authorized_date::DATE < DATE_TRUNC('day', CURRENT_DATE + INTERVAL '1 day')
      GROUP BY transactions.authorized_date::DATE
    )
      SELECT
        dates.day as date,
        COALESCE(SUM(expenses.amount), 0) as amount,
        COALESCE(SUM(SUM(expenses.amount)) OVER (ORDER BY dates.day), 0) as total_amount
      FROM dates
      LEFT JOIN expenses ON expenses.authorized_date = dates.day
      GROUP BY dates.day
      ORDER BY dates.day ASC;
  `;

	const result = await db.execute(statement);
	const data = result.rows.map(row => {
		const parsedData = ResponseSchema.safeParse(row);
		if (parsedData.success) {
			return parsedData.data;
		}
		return null;
	});

	return json({ data });
}

export default function LastMonthExpense() {
	const lastMonthExpense = useFetcher<typeof loader>();

	useEffect(() => {
		lastMonthExpense.submit(null, {
			method: 'GET',
			action: '/last-month-expense',
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<Card>
			<CardContent className="flex items-center justify-between gap-2 p-1 pl-5">
				<div className="flex flex-col gap-1">
					<p className="text-xs text-muted-foreground">Last month expense</p>
					<p className="text-3xl font-bold">
						{formatCurrency(
							// The last item in the array is the total of all the previous days
							// include the current day
							lastMonthExpense.data?.data.at(-1)?.total_amount || 0,
						)}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
