import { useMemo } from 'react';
import { Line, LineChart } from 'recharts';
import { type ChartConfig, ChartContainer } from '~/app/components/ui/chart';
import { formatCurrency } from '~/app/utils/format-currency';
import { type Account, type BankConnection } from '~/db/schema';

export type TotalBalanceProps = {
	connections: (BankConnection & {
		accounts: Account[];
	})[];
};

const chartConfig = {
	amount: {
		label: 'Amount',
		color: 'hsl(var(--chart-green))',
	},
} satisfies ChartConfig;

export default function TotalBalance({ connections }: TotalBalanceProps) {
	const totalBalance = useMemo(
		() =>
			connections.reduce((acc, connection) => {
				return (
					acc +
					connection.accounts.reduce(
						(acc, account) => acc + Number(account.available_balance),
						0,
					)
				);
			}, 0),
		[connections],
	);

	return (
		<div className="flex items-center justify-between gap-2 rounded-lg bg-gray-200 p-4 dark:bg-gray-900">
			<div className="flex flex-col gap-1">
				<p className="text-xs text-gray-500">Total balance</p>
				<p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
			</div>

			<div className="h-full w-full max-w-28">
				<ChartContainer config={chartConfig}>
					<LineChart
						accessibilityLayer
						data={[{ amount: 0 }, { amount: totalBalance }]}
						margin={{
							left: 12,
							right: 12,
						}}
					>
						<Line
							dataKey="amount"
							type="natural"
							stroke="var(--color-amount)"
							strokeWidth={2}
							dot={false}
						/>
					</LineChart>
				</ChartContainer>
			</div>
		</div>
	);
}
