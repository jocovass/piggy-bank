import { eq } from 'drizzle-orm';
import {
	Configuration,
	CountryCode,
	PlaidApi,
	PlaidEnvironments,
	type PlaidError,
	type LinkTokenCreateRequest,
	type Transaction,
	type RemovedTransaction,
	Products,
} from 'plaid';
import { getBankConnectionByItemId } from '~/app/persistance/bank-connections';
import { getDomainUrl } from '~/app/utils/misc';
import { db } from '~/db/index.server';
import { bankConnections } from '~/db/schema';

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
 * @param param0.itemId The login we want revalidate | update.
 * @param param0.accessTokens The access tokens issude by Plaid. Needed
 * in update mode only.
 */
export async function generateLinkToken({
	itemId,
	request,
	selectNewAccount,
	userId,
}: {
	itemId?: string | null;
	request: Request;
	selectNewAccount?: boolean;
	userId: string;
}) {
	const domain = getDomainUrl(request);
	let accessToken: string[] | undefined;
	let products: Products[] = [Products.Transactions];

	/**
	 * Update mode we need to send the access token an the products array has to
	 * be empty.
	 */
	if (itemId) {
		/**
		 * TODO: move this to DB service.
		 */
		const bankConnection = await db.query.bankConnections.findFirst({
			columns: { access_token: true },
			where: eq(bankConnections.plaid_item_id, itemId),
		});

		if (!bankConnection) {
			throw new Error('Item does not exist.');
		}

		accessToken = [bankConnection.access_token];
		products = [];
	}

	const linkTokenConfig: LinkTokenCreateRequest = {
		access_tokens: accessToken,
		user: { client_user_id: userId },
		/**
		 * This is used to test the "returning user" flow. It means if the user
		 * specifies their phone number plaid will save their authentiacted institutions
		 * for quick access in the future. The "link_customization_name" prop is used
		 * to test it in sandbox mode.
		 */
		// link_customization_name: 'REMEMBER_ME_SANDBOX',
		products,
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
		update: selectNewAccount ? { account_selection_enabled: true } : undefined,
	};

	const linkTokenResponse = await plaidClient.linkTokenCreate(linkTokenConfig);

	return linkTokenResponse.data;
}

export async function getItem({ accessToken }: { accessToken: string }) {
	const response = await plaidClient.itemGet({
		access_token: accessToken,
		client_id: process.env.PLAID_CLIENT_ID,
		secret: process.env.PLAID_SECRET,
	});

	return response.data;
}

export async function getInstitutionById({
	institutionId,
}: {
	institutionId: string;
}) {
	const response = await plaidClient.institutionsGetById({
		country_codes: [CountryCode.Gb],
		institution_id: institutionId,
		client_id: process.env.PLAID_CLIENT_ID,
		secret: process.env.PLAID_SECRET,
		options: {
			include_optional_metadata: true,
		},
	});

	return response.data;
}

export async function getAccounts({ accessToken }: { accessToken: string }) {
	const response = await plaidClient.accountsGet({
		access_token: accessToken,
		client_id: process.env.PLAID_CLIENT_ID,
		secret: process.env.PLAID_SECRET,
	});

	return response.data;
}

export async function exchangePublicToken(publicToken: string) {
	const response = await plaidClient.itemPublicTokenExchange({
		public_token: publicToken,
	});

	return response.data;
}

export async function syncTransactions({
	accessToken,
	cursor,
	count = 100,
}: {
	accessToken: string;
	cursor?: string;
	count?: number;
}) {
	const response = await plaidClient.transactionsSync({
		access_token: accessToken,
		count,
		cursor,
	});

	return response.data;
}

export type FetchTransactionsResponse = Promise<{
	accessToken: string;
	added: Transaction[];
	cursor: string | null;
	modified: Transaction[];
	removed: RemovedTransaction[];
}>;

export async function fetchTransactions({
	itemId,
}: {
	itemId: string;
}): FetchTransactionsResponse;
export async function fetchTransactions({
	accessToken,
	cursor,
}: {
	accessToken: string;
	cursor?: string;
}): FetchTransactionsResponse;
export async function fetchTransactions({
	itemId,
	accessToken,
	cursor,
}: {
	itemId?: string;
	accessToken?: string;
	cursor?: string;
}) {
	let access_token!: string;
	let transaction_cursor!: string | null | undefined;

	if (itemId) {
		const bankConnection = await getBankConnectionByItemId(itemId);
		access_token = bankConnection.access_token;
		transaction_cursor = bankConnection.transaction_cursor;
	} else if (accessToken) {
		access_token = accessToken;
		transaction_cursor = cursor;
	}

	let _cursor = transaction_cursor;
	/**
	 * New transaction updates since "cursor"
	 */
	let added: Transaction[] = [];
	let modified: Transaction[] = [];
	/**
	 * Removed transaction ids
	 */
	let removed: RemovedTransaction[] = [];
	let hasMore = true;

	try {
		while (hasMore) {
			const transactionResponse = await syncTransactions({
				accessToken: access_token,
				cursor: _cursor || undefined,
			});
			added = added.concat(transactionResponse.added);
			modified = modified.concat(transactionResponse.modified);
			removed = removed.concat(transactionResponse.removed);
			hasMore = transactionResponse.has_more;
			_cursor = transactionResponse.next_cursor;
		}
	} catch (error) {
		console.error(`Error while fetching transactions: ${error}`);
		_cursor = transaction_cursor;
	}

	return {
		accessToken: access_token,
		added,
		cursor: _cursor,
		modified,
		removed,
	};
}
