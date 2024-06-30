import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

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
