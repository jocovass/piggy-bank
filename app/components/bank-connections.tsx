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
import { useHints } from '~/app/utils/client-hints';
import { formatCurrency } from '~/app/utils/format-currency';
import { type Account, type BankConnection } from '~/db/schema';

export type BankConnectionsProps = {
	connections: (BankConnection & {
		accounts: Account[];
	})[];
};

export default function BankConnections({ connections }: BankConnectionsProps) {
	const hints = useHints();

	console.log(connections);

	return (
		<div>
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
							<AccordionTrigger>
								<div>
									<div className="flex items-center gap-2 pb-2">
										<img
											className="h-8 w-8 rounded-full"
											src={`data:image/png;base64, ${connection.logo}`}
											alt={connection.name}
											title={connection.name}
										/>

										<div className="flex flex-col items-start px-2">
											<p className="text-sm font-medium text-gray-900 dark:text-white">
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
									<div>
										<p>Available balance: {formatCurrency(balance)}</p>
									</div>
								</div>
							</AccordionTrigger>
							<AccordionContent className="flex gap-4 overflow-x-auto pt-2">
								{connection.accounts.map(account => (
									<Account
										key={account.id}
										account={account}
										logo={connection.logo}
									/>
								))}
							</AccordionContent>
						</AccordionItem>
					);
				})}
			</Accordion>
		</div>
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
