import { json, type ActionFunctionArgs } from '@remix-run/node';
import { CountryCode, Products } from 'plaid';
import { plaidClient } from '~/app/services/plaid.server';
import { requireUser } from '~/app/utils/auth.server';

export async function action({ request, params }: ActionFunctionArgs) {
	const user = await requireUser(request);
	const linkTokenResponse = await plaidClient.linkTokenCreate({
		access_tokens: [],
		user: { client_user_id: user.id },
		products: [Products.Transactions],
		client_name: 'Piggy Bank',
		language: 'en',
		country_codes: [CountryCode.Gb],
	});

	return json(
		{
			data: {
				...linkTokenResponse.data,
				userId: user.id,
			},
		},
		{ status: 200 },
	);
}
