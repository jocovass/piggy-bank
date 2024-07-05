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
		products: [Products.Transactions],
		transactions: {
			days_requested: 730,
		},
		client_name: 'Piggy Bank',
		language: 'en',
		redirect_uri: domain + '/plaid-oauth',
		country_codes: [CountryCode.Gb],
		webhook: domain + 'plaid-webhook',
	});
	return linkTokenResponse.data;
}
