import {
	Configuration,
	CountryCode,
	PlaidApi,
	PlaidEnvironments,
	type PlaidError,
	Products,
} from 'plaid';
import { getDomainUrl } from '~/app/utils/misc';

const plaidEnv = process.env.PLAID_ENV || 'sandbox';

const plaidConfig = new Configuration({
	basePath: PlaidEnvironments[plaidEnv],
	baseOptions: {
		headers: {
			'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
			'PLAID-SECRET': process.env.PLAID_SECRET,
			'Plaid-Version': '2020-09-14',
		},
	},
});

export const plaidClient = new PlaidApi(plaidConfig);

/**
 * Assertion function to check if the error is a PlaidError.
 */
export function isPliadError(error: any): error is PlaidError {
	return (
		typeof error.type === 'string' &&
		typeof error.error_code === 'string' &&
		typeof error.error_message === 'string' &&
		typeof error.display_message === 'string' &&
		typeof error.request_id === 'string'
	);
}

/**
 * Generate a public link token for the authenticated user.
 * @param param0
 * @param param0.userId The user ID of the authenticated user.
 * @param param0.accessTokens The access tokens issude by Plaid. Needed
 * in update mode only.
 */
export async function generateLinkToken({
	userId,
	accessTokens,
	request,
}: {
	userId: string;
	accessTokens?: string[];
	request: Request;
}) {
	const domain = getDomainUrl(request);
	const linkTokenResponse = await plaidClient.linkTokenCreate({
		access_tokens: accessTokens,
		user: { client_user_id: userId },
		/**
		 * This is used to test the "returning user" flow. It means if the user
		 * specifies their phone number plaid will save their authentiacted institutions
		 * for quick access in the future. The "link_customization_name" prop is used
		 * to test it in sandbox mode.
		 */
		// link_customization_name: 'REMEMBER_ME_SANDBOX',
		products: [Products.Transactions],
		transactions: {
			days_requested: 730,
		},
		client_name: 'Piggy Bank',
		language: 'en',
		redirect_uri: domain + '/plaid-oauth',
		country_codes: [CountryCode.Gb],
		/**
		 * Needs a producation url
		 */
		webhook: domain.startsWith('https://')
			? domain + '/plaid-webhook'
			: undefined,
	});
	return linkTokenResponse.data;
}
