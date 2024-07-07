import { type MetaFunction } from '@remix-run/node';
import { AddBankAccount } from '~/app/routes/_resources+/generate-link-token';

export const meta: MetaFunction = () => {
	return [
		{ title: 'New Remix App' },
		{ name: 'description', content: 'Welcome to Remix!' },
	];
};

export default function Dashboard() {
	return (
		<div>
			<p>
				Welcome to your new dashboard! Connect a bank account to get started.
			</p>
			<AddBankAccount />
		</div>
	);
}
