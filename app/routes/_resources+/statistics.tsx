import { parseWithZod } from '@conform-to/zod';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { formatInTimeZone } from 'date-fns-tz';
import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { useSpinDelay } from 'spin-delay';
import { z } from 'zod';
import Spinner from '~/app/components/icons/spinner';
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
import { getUserTransactionsForStatisticsCard } from '~/app/data-access/transactions';
import { requireUser } from '~/app/utils/auth.server';
import { useHints } from '~/app/utils/client-hints';
import { createToastHeader } from '~/app/utils/toast.server';

export const schema = z.object({
	filter: z.enum(['seven_days', 'thirty_days', 'year']),
});

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request);
	const form = await request.formData();
	const submission = await parseWithZod(form, {
		schema,
		async: true,
	});

	if (submission.status !== 'success') {
		return json(
			{
				data: submission.reply(),
				status: 'error',
			} as const,
			{
				status: 400,
				headers: await createToastHeader({
					title: 'Statistics could not be loaded',
					description: 'Please include a valid filter',
					type: 'error',
				}),
			},
		);
	}

	const transactions = await getUserTransactionsForStatisticsCard({
		filter: submission.value.filter,
		userId: user.id,
	});
	return json({ transactions, status: 'success' } as const);
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
	const dataFetcher = useFetcher<typeof action>();
	const { timeZone } = useHints();
	const [filter, setFilter] = useState('thirty_days');
	const transactions =
		dataFetcher.data?.status === 'success'
			? dataFetcher.data?.transactions
			: [];
	const loading = useSpinDelay(dataFetcher.state !== 'idle', {
		minDuration: 1000,
	});

	useEffect(() => {
		dataFetcher.submit(
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

				<div className="flex items-center gap-2">
					{loading && <Spinner className="size-4" />}
					<Select
						value={filter}
						onValueChange={value => {
							setFilter(value);
							dataFetcher.submit(
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
							<SelectItem value="seven_days">7 Days</SelectItem>
							<SelectItem value="thirty_days">30 Days</SelectItem>
							<SelectItem value="year">Year</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="h-[300px] w-full">
					<AreaChart
						accessibilityLayer
						data={transactions}
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
