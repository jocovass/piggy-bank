import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { sql } from 'drizzle-orm';
import { useEffect } from 'react';
import { Line, LineChart } from 'recharts';
import { z } from 'zod';
import { Card, CardContent } from '~/app/components/ui/card';
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '~/app/components/ui/chart';
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

const chartConfig = {
	total_amount: {
		label: 'Amount',
		color: 'hsl(var(--primary))',
	},
} satisfies ChartConfig;

export default function CurrentMonthExpense() {
	const lastMonthExpense = useFetcher<typeof loader>();

	useEffect(() => {
		lastMonthExpense.submit(null, {
			method: 'GET',
			action: '/current-month-expense',
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<Card>
			<CardContent className="flex items-center justify-between gap-2 px-5 py-2">
				<div className="flex flex-col gap-1">
					<p className="text-xs text-muted-foreground">Current month expense</p>
					<p className="text-3xl font-bold">
						{formatCurrency(
							// The last item in the array is the total of all the previous days
							// include the current day
							lastMonthExpense.data?.data.at(-1)?.total_amount || 0,
						)}
					</p>
				</div>

				<ChartContainer
					config={chartConfig}
					className="min-h-[90px] max-w-[120px]"
				>
					<LineChart accessibilityLayer data={lastMonthExpense.data?.data}>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent className="min-w-44" hideLabel />}
						/>
						<Line
							dataKey="total_amount"
							type="natural"
							stroke="var(--color-total_amount)"
							strokeWidth={2}
							dot={false}
						/>
					</LineChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
