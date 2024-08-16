import {
	type MetaFunction,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { formatInTimeZone } from 'date-fns-tz';
import BankConnections from '~/app/components/bank-connections';
import TotalBalance from '~/app/components/total-balance';
import { getAccountsWithBank } from '~/app/data-access/accounts';
import { getBankConnectionsForUser } from '~/app/data-access/bank-connections';
import { getTransactions } from '~/app/data-access/transactions';
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
	const bankConnections = await getBankConnectionsForUser({
		userId: user.id,
	});
	const transactions = await getTransactions({
		userId: user.id,
	});

	return json({
		accounts,
		bankConnections,
		transactions,
	} as const);
}

export default function Dashboard() {
	const hints = useHints();
	const data = useLoaderData<typeof loader>();

	return (
		<div>
			<TotalBalance connections={data.bankConnections} />
			<BankConnections connections={data.bankConnections} />

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
