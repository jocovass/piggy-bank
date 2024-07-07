import { type ActionFunctionArgs, redirect } from '@remix-run/node';
import { plaidClient } from '~/app/services/plaid.server';
import { requireUser } from '~/app/utils/auth.server';

export async function action({ request }: ActionFunctionArgs) {
	await requireUser(request);
	const formData = await request.formData();
	const publicToken = formData.get('publicToken') as string;
	const response = await plaidClient.itemPublicTokenExchange({
		public_token: publicToken,
	});
	console.log(response.data);
	return redirect('/');
}
