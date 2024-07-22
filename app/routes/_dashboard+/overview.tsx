import {
	type MetaFunction,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getAccounts } from '~/app/persistance/accounts';
import { getBankConnections } from '~/app/persistance/bank-connections';
import { AddBankAccount } from '~/app/routes/_resources+/generate-link-token';
import { requireUser } from '~/app/utils/auth.server';

export const meta: MetaFunction = () => {
	return [
		{ title: 'New Remix App' },
		{ name: 'description', content: 'Welcome to Remix!' },
	];
};

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request);
	const bankConnections = await getBankConnections(user.id);
	const accounts = await getAccounts(user.id);
	return json({ accounts, bankConnections });
}

export default function Dashboard() {
	const data = useLoaderData<typeof loader>();
	console.log(data);
	return (
		<div>
			<p>
				Welcome to your new dashboard! Connect a bank account to get started.
			</p>
			{data.bankConnections ? (
				<div>
					<img
						src={`data:image/png;base64, ${data.bankConnections[0].logo}`}
						alt=""
					/>
				</div>
			) : null}
			<AddBankAccount />
		</div>
	);
}
