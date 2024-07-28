import {
	type MetaFunction,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { formatInTimeZone } from 'date-fns-tz';
import { useMemo } from 'react';
import { ElipsisVertical } from '~/app/components/icons/elipsis-vertical';
import { Button } from '~/app/components/ui/button';
import {
	Popover,
	PopoverClose,
	PopoverContent,
	PopoverTrigger,
} from '~/app/components/ui/popover';
import { getAccountsWithBank } from '~/app/persistance/accounts';
import { getTransactions } from '~/app/persistance/transactions';
import { AddBankAccount } from '~/app/routes/_resources+/generate-link-token';
import { requireUser } from '~/app/utils/auth.server';
import { useHints } from '~/app/utils/client-hints';
import { formatCurrency } from '~/app/utils/format-currency';

export const meta: MetaFunction = () => {
	return [
		{ title: 'New Remix App' },
		{ name: 'description', content: 'Welcome to Remix!' },
	];
};

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request);
	const accounts = await getAccountsWithBank(user.id);
	const transactions = await getTransactions({
		userId: user.id,
	});

	return json({
		accounts,
		transactions,
	});
}

export default function Dashboard() {
	const hints = useHints();
	const data = useLoaderData<typeof loader>();
	const removeBankConnection = useFetcher();

	const totalBalance = useMemo(() => {
		const total = data.accounts.reduce((acc, account) => {
			return (
				acc + (account.current_balance ? Number(account.current_balance) : 0)
			);
		}, 0);
		return formatCurrency(total);
	}, [data.accounts]);

	return (
		<div>
			<AddBankAccount />
			<div className="mb-4 mt-4">
				<p>Total balance</p>
				<p className="text-2xl">{totalBalance}</p>
			</div>

			{data.accounts.map(account => (
				<div key={account.id} className="relative mb-4 inline-block">
					<Popover>
						<PopoverTrigger className="absolute right-0 top-0">
							<ElipsisVertical />
						</PopoverTrigger>
						<PopoverContent className="flex w-32 flex-col p-2" align="start">
							<PopoverClose asChild>
								<Button
									className="justify-start"
									variant="ghost"
									size="sm"
									onClick={() =>
										removeBankConnection.submit(
											{ id: account.bank_connection_id },
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
						className={`h-14 w-14 rounded-full`}
						src={`data:image/png;base64, ${account.bankConnection.logo}`}
						alt={account.bankConnection.name}
					/>
					<p>{account.name}</p>
					<p>
						{formatCurrency(
							account.current_balance ? +account.current_balance : 0,
						)}
					</p>
				</div>
			))}

			{data.transactions.map(transaction => (
				<div
					className="flex gap-4 even:bg-gray-100 even:dark:bg-gray-800"
					key={transaction.id}
				>
					<p>{transaction.name}</p>
					<p>{formatCurrency(+transaction.amount)}</p>
					<p>
						{formatInTimeZone(
							transaction.created_at,
							hints.timeZone,
							'dd.MM.yyyy',
						)}
					</p>
				</div>
			))}
		</div>
	);
}
