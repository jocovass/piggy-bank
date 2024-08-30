import { UTCDate } from '@date-fns/utc';
import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { lt, and, eq, lte, gte, sum } from 'drizzle-orm';
import { useEffect, useMemo } from 'react';
import {
	Label,
	PolarGrid,
	PolarRadiusAxis,
	RadialBar,
	RadialBarChart,
} from 'recharts';
import { Card, CardContent } from '~/app/components/ui/card';
import { type ChartConfig, ChartContainer } from '~/app/components/ui/chart';
import { requireUser } from '~/app/utils/auth.server';
import { formatCurrency } from '~/app/utils/format-currency';
import { db } from '~/db/index.server';
import { transactions } from '~/db/schema';

/**
 * TODO: Save this to DB and make it editable
 */
const targetMonthlyIncome = 5000;

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request);
	const today = new UTCDate();
	const firstDayOfMonth = new UTCDate(today.getFullYear(), today.getMonth(), 1);

	const [result] = await db
		.select({ amount: sum(transactions.amount) })
		.from(transactions)
		.where(
			and(
				eq(transactions.user_id, user.id),
				/**
				 * Negative amount means income
				 */
				lt(transactions.amount, '0'),
				gte(transactions.authorized_date, firstDayOfMonth),
				lte(transactions.authorized_date, today),
			),
		);
	return json({ amount: result.amount });
}

const chartConfig: ChartConfig = {
	income: {
		label: 'Total income',
		color: 'hsl(var(--chart-2))',
	},
};

export default function CurrentMonthIncome() {
	const lastMonthIncomFetcher = useFetcher<typeof loader>();

	const chartData = useMemo(() => {
		return [
			{
				item: 'income',
				amount: Number(lastMonthIncomFetcher.data?.amount?.slice(1)) || 0,
				fill: 'var(--color-income)',
			},
		];
	}, [lastMonthIncomFetcher.data]);

	const targetPercent = useMemo(() => {
		return (
			((Number(lastMonthIncomFetcher.data?.amount?.slice(1)) || 1) * 100) /
			targetMonthlyIncome
		);
	}, [lastMonthIncomFetcher.data]);

	const chartFillAmount = useMemo(() => {
		const max = 360;

		if (targetPercent > 100) {
			return max;
		}

		return (max * targetPercent) / 100;
	}, [targetPercent]);

	useEffect(() => {
		lastMonthIncomFetcher.submit(null, {
			method: 'GET',
			action: '/current-month-income',
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<Card>
			<CardContent className="flex items-center justify-between gap-2 p-1 pl-5">
				<div className="flex flex-col gap-1">
					<p className="text-xs text-muted-foreground">Current month income</p>
					<p className="text-2xl font-bold">
						{formatCurrency(
							Number(lastMonthIncomFetcher.data?.amount?.slice(1)) || 0,
						)}
					</p>
				</div>

				<ChartContainer
					config={chartConfig}
					className="min-h-[100px] max-w-[90px]"
				>
					<RadialBarChart
						data={chartData}
						startAngle={0}
						endAngle={chartFillAmount}
						innerRadius={32}
						outerRadius={48}
					>
						<PolarGrid
							gridType="circle"
							radialLines={false}
							stroke="none"
							className="first:fill-muted last:fill-background"
							polarRadius={[35, 28]}
						/>
						<RadialBar dataKey="amount" background cornerRadius={10} />
						<PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
							<Label
								content={({ viewBox }) => {
									if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
										return (
											<text
												x={viewBox.cx}
												y={viewBox.cy}
												textAnchor="middle"
												dominantBaseline="middle"
											>
												<tspan
													x={viewBox.cx}
													y={viewBox.cy}
													className="fill-foreground text-sm font-bold"
												>
													{targetPercent.toFixed(0)}%
												</tspan>
											</text>
										);
									}
								}}
							/>
						</PolarRadiusAxis>
					</RadialBarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
