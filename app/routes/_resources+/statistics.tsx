// import { parseWithZod } from '@conform-to/zod';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { formatInTimeZone } from 'date-fns-tz';
import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { z } from 'zod';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '~/app/components/ui/card';
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '~/app/components/ui/chart';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/app/components/ui/select';
import { getUserTransactionsForLastThirtyDays } from '~/app/data-access/transactions';
import { requireUser } from '~/app/utils/auth.server';
import { useHints } from '~/app/utils/client-hints';

export const schema = z.object({
	filter: z.enum(['week', 'thirty_days', 'year']),
});

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request);
	const transactions = await getUserTransactionsForLastThirtyDays({
		userId: user.id,
	});
	return json({ transactions });
}

const chartConfig = {
	total_income: {
		label: 'Income',
		color: 'hsl(var(--chart-2))',
	},
	total_expense: {
		label: 'Expense',
		color: 'hsl(var(--chart-1))',
	},
} satisfies ChartConfig;

export default function Statistics() {
	const data = useFetcher<typeof action>();
	const { timeZone } = useHints();
	const [filter, setFilter] = useState('thirty_days');

	useEffect(() => {
		data.submit(
			{ filter },
			{
				method: 'POST',
				action: '/statistics',
			},
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between pb-0">
				<CardTitle className="text-base">Statistics</CardTitle>

				<Select
					value={filter}
					onValueChange={value => {
						setFilter(value);
						data.submit(
							{ filter: value },
							{
								method: 'POST',
								action: '/statistics',
							},
						);
					}}
				>
					<SelectTrigger className="w-[130px]">
						<SelectValue placeholder="Interval" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="week">Week</SelectItem>
						<SelectItem value="thirty_days">30 Days</SelectItem>
						<SelectItem value="year">Year</SelectItem>
					</SelectContent>
				</Select>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="h-[300px] w-full">
					<AreaChart
						accessibilityLayer
						data={data.data?.transactions}
						margin={{
							left: 12,
							right: 12,
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="date"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={value =>
								formatInTimeZone(value, timeZone, 'dd. MMM')
							}
						/>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent className="min-w-44" />}
						/>
						<defs>
							<linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-total_expense)"
									stopOpacity={0.8}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-total_expense)"
									stopOpacity={0.1}
								/>
							</linearGradient>
							<linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-total_income)"
									stopOpacity={0.8}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-total_income)"
									stopOpacity={0.1}
								/>
							</linearGradient>
						</defs>
						<Area
							dataKey="total_income"
							type="linear"
							fill="url(#fillIncome)"
							fillOpacity={0.4}
							stroke="var(--color-total_income)"
							stackId="a"
						/>
						<Area
							dataKey="total_expense"
							type="linear"
							fill="url(#fillExpense)"
							fillOpacity={0.4}
							stroke="var(--color-total_expense)"
							stackId="a"
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
