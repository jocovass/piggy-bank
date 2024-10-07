import { useFetcher } from '@remix-run/react';
import { formatInTimeZone } from 'date-fns-tz';
import { ElipsisVertical } from '~/app/components/icons/elipsis-vertical';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '~/app/components/ui/accordion';
import { Button } from '~/app/components/ui/button';
import {
	Popover,
	PopoverClose,
	PopoverContent,
	PopoverTrigger,
} from '~/app/components/ui/popover';
import { AddBankAccount } from '~/app/routes/_resources+/generate-link-token';
import { useHints } from '~/app/utils/client-hints';
import { formatCurrency } from '~/app/utils/format-currency';
import { type Account, type BankConnection } from '~/db/schema';
import Plus from './icons/plus';
import Spinner from './icons/spinner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './ui/tooltip';

export type BankConnectionsProps = {
	connections: (BankConnection & {
		accounts: Account[];
	})[];
};

export default function BankConnections({ connections }: BankConnectionsProps) {
	const hints = useHints();

	return (
		<Card className="h-full max-h-[236px] overflow-y-auto">
			<CardHeader className="flex-row items-center justify-between pb-0 pr-3">
				<CardTitle className="text-base">Accounts</CardTitle>
				<AddBankAccount>
					{({ loading }) => (
						<Button
							className="size-8 rounded-full p-0"
							disabled={loading}
							type="submit"
							variant="ghost"
						>
							{loading ? (
								<Spinner className="size-4" />
							) : (
								<Plus className="size-4" />
							)}
						</Button>
					)}
				</AddBankAccount>
			</CardHeader>
			<CardContent>
				<Accordion type="single" collapsible className="w-full">
					{connections.map(connection => {
						const balance = connection.accounts.reduce(
							(acc, account) => acc + Number(account.available_balance),
							0,
						);

						return (
							<AccordionItem
								key={connection.id}
								value={connection.id}
								className="border-b-0"
							>
								<AccordionTrigger className="gap-4 [&>svg]:self-start">
									<div className="text-left">
										<div className="flex items-center gap-2 pb-2">
											<img
												className="h-8 w-8 self-start rounded-full bg-muted"
												src={`data:image/png;base64, ${connection.logo}`}
												alt={connection.name}
												title={connection.name}
											/>

											<div className="px-2">
												<p className="w-full overflow-hidden text-ellipsis text-sm font-medium text-gray-900 dark:text-white">
													{connection.name}
												</p>

												<p className="text-xs text-gray-500 dark:text-gray-400">
													Connected:{' '}
													{formatInTimeZone(
														connection.created_at,
														hints.timeZone,
														'dd.MM.yyyy',
													)}
												</p>
											</div>
										</div>
										<p className="text-xs">
											Balance: {formatCurrency(balance)}
										</p>
									</div>
								</AccordionTrigger>
								<AccordionContent className="flex items-center gap-4 overflow-x-auto pt-2">
									{connection.accounts.map(account => (
										<Account
											key={account.id}
											account={account}
											logo={connection.logo}
										/>
									))}

									<AddBankAccount itemId={connection.plaid_item_id}>
										{({ loading }) => (
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															className="size-14 rounded-full p-0"
															disabled={loading}
															type="submit"
															variant="outline"
														>
															{loading ? (
																<Spinner className="size-5" />
															) : (
																<Plus className="size-5" />
															)}
														</Button>
													</TooltipTrigger>
													<TooltipContent>
														<p>Link new account</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										)}
									</AddBankAccount>
								</AccordionContent>
							</AccordionItem>
						);
					})}
				</Accordion>
			</CardContent>
		</Card>
	);
}

export function Account({
	account,
	logo,
}: {
	account: Account;
	logo?: string | null;
}) {
	const removeBankConnection = useFetcher();

	return (
		<div className="flex w-[80px] flex-col items-center gap-1 text-center">
			<div className="relative mb-1">
				<Popover>
					<PopoverTrigger className="absolute right-[-16px] top-[-5px]">
						<ElipsisVertical className="size-5" />
					</PopoverTrigger>
					<PopoverContent className="flex w-32 flex-col p-1" align="start">
						<PopoverClose asChild>
							<Button
								className="justify-start text-sm"
								variant="ghost"
								size="sm"
								onClick={() =>
									removeBankConnection.submit(
										{
											accountId: account.id,
											bankConnectionId: account.bank_connection_id,
										},
										{
											method: 'POST',
											action: '/remove-bank-connection',
										},
									)
								}
							>
								Delete
							</Button>
						</PopoverClose>
					</PopoverContent>
				</Popover>
				<img
					className="h-8 w-8 rounded-full"
					src={`data:image/png;base64, ${logo}`}
					alt={account.name}
					title={account.name}
				/>
			</div>
			<p className="text-xs">{account.name}</p>
			<p>
				{formatCurrency(
					account.available_balance ? +account.available_balance : 0,
				)}
			</p>
		</div>
	);
}
