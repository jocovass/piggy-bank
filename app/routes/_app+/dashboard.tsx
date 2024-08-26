import {
	type MetaFunction,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import BankConnections from '~/app/components/bank-connections';
import RecentTransactions from '~/app/components/recent-transactions';
import TotalBalance from '~/app/components/total-balance';
import { getAccountsWithBank } from '~/app/data-access/accounts';
import { getBankConnectionsForUser } from '~/app/data-access/bank-connections';
import { getTransactions } from '~/app/data-access/transactions';
import CurrentMonthExpense from '~/app/routes/_resources+/current-month-expense';
import CurrentMonthIncome from '~/app/routes/_resources+/current-month-income';
import Statistics from '~/app/routes/_resources+/statistics';
import { requireUser } from '~/app/utils/auth.server';

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
	const data = useLoaderData<typeof loader>();

	return (
		<div>
			<TotalBalance connections={data.bankConnections} />
			<BankConnections connections={data.bankConnections} />
			<CurrentMonthIncome />
			<CurrentMonthExpense />
			<RecentTransactions transactions={data.transactions || []} />
			<Statistics />
		</div>
	);
}
