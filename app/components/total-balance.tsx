import { useMemo } from 'react';
import { Label, Pie, PieChart } from 'recharts';
import { Card, CardContent } from '~/app/components/ui/card';
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '~/app/components/ui/chart';
import { formatCurrency } from '~/app/utils/format-currency';
import { type Account, type BankConnection } from '~/db/schema';

export type TotalBalanceProps = {
	connections: (BankConnection & {
		accounts: Account[];
	})[];
};

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

	const chartConfig = useMemo<ChartConfig>(
		() =>
			connections.reduce((acc, connection) => {
				const newValue = {
					...acc,
					[connection.plaid_institution_id]: {
						label: connection.name,
						color: connection.primary_color,
					},
				};
				return newValue;
			}, {}),
		[connections],
	);

	const chartData = useMemo(
		() =>
			connections.reduce(
				(acc, connection) => {
					const newValue = [
						...acc,
						{
							bank: connection.plaid_institution_id,
							amount: connection.accounts.reduce(
								(acc, account) => acc + Number(account.available_balance),
								0,
							),
							fill: connection.primary_color as string,
						},
					];
					return newValue;
				},
				[] as { bank: string; amount: number; fill: string }[],
			),
		[connections],
	);

	return (
		<Card>
			<CardContent className="flex items-center justify-between gap-2 p-1 pl-5">
				<div className="flex flex-col gap-1">
					<p className="text-xs text-muted-foreground">Total balance</p>
					<p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
				</div>

				<ChartContainer
					config={chartConfig}
					className="min-h-[100px] max-w-[100px]"
				>
					<PieChart>
						<ChartTooltip
							content={<ChartTooltipContent className="min-w-52" hideLabel />}
						/>
						<Pie
							data={chartData}
							dataKey="amount"
							nameKey="bank"
							innerRadius={29}
							strokeWidth={5}
						>
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
													{totalBalance}
												</tspan>
											</text>
										);
									}
								}}
							/>
						</Pie>
					</PieChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
