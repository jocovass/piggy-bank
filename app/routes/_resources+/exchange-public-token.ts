import { parseWithZod } from '@conform-to/zod';
import { type ActionFunctionArgs, redirect, json } from '@remix-run/node';
import invariant from 'tiny-invariant';
import { z } from 'zod';
import { createAccounts } from '~/app/data-access/accounts';
import {
	createBankConnection,
	getConsentExpirationDate,
	getBankConnectionByInstitutionId,
	updateBankConnection,
} from '~/app/data-access/bank-connections';
import {
	createOrUpdateTransactions,
	deleteTransactions,
} from '~/app/data-access/transactions';
import {
	exchangePublicToken,
	fetchTransactions,
	getAccounts,
	getInstitutionById,
	getItem,
} from '~/app/services/plaid.server';
import { requireUser } from '~/app/utils/auth.server';
import { createToastHeader } from '~/app/utils/toast.server';
import { db } from '~/db/index.server';

const schema = z.object({
	institutionId: z.string(),
	publicToken: z.string(),
	userId: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
	await requireUser(request);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, { schema, async: true });

	if (submission.status !== 'success') {
		const message = submission.error
			? Object.values(submission.error).reduce(
					(acc, msg) => acc + ` ${msg ?? ''}`,
					'',
				)
			: 'Missing request body';

		return json(
			{},
			{
				headers: await createToastHeader({
					title: 'Invalid request',
					description: message,
					type: 'error',
				}),
			},
		);
	}

	const bankConnection = await getBankConnectionByInstitutionId({
		institutionId: submission.value.institutionId,
		columns: { id: true },
	});

	if (bankConnection) {
		return json(null, {
			status: 409,
			headers: await createToastHeader({
				title: 'Invalid request',
				description: 'Bank account is already in use',
				type: 'error',
			}),
		});
	}

	const { publicToken, userId } = submission.value;
	const tokenResponse = await exchangePublicToken(publicToken);
	const itemResponse = await getItem({
		accessToken: tokenResponse.access_token,
	});
	const institutionsResponse = itemResponse.item.institution_id
		? await getInstitutionById({
				institutionId: itemResponse.item.institution_id,
			})
		: null;

	invariant(institutionsResponse, 'Institution should not be null');

	const accountsResponse = await getAccounts({
		accessToken: tokenResponse.access_token,
	});

	const { added, cursor, modified, removed } = await fetchTransactions({
		accessToken: tokenResponse.access_token,
	});

	await db.transaction(async tx => {
		const bankConnection = await createBankConnection({
			data: {
				access_token: tokenResponse.access_token,
				plaid_item_id: itemResponse.item.item_id,
				plaid_institution_id: institutionsResponse.institution.institution_id,
				name: institutionsResponse.institution.name,
				user_id: userId,
				consent_expiration_time: getConsentExpirationDate(
					itemResponse.item.consent_expiration_time,
				),
				logo: institutionsResponse.institution.logo,
				primary_color: institutionsResponse.institution.primary_color,
			},
			tx,
		});

		const accounts = await createAccounts({
			plaidAccounts: accountsResponse.accounts.map(account => ({
				bank_connection_id: bankConnection.id,
				user_id: userId,
				plaid_account_id: account.account_id,
				name: account.name,
				official_name: account.official_name,
				mask: account.mask,
				current_balance: account.balances.current
					? String(account.balances.current)
					: undefined,
				available_balance: account.balances.available
					? String(account.balances.available)
					: undefined,
				iso_currency_code: account.balances.iso_currency_code,
				type: account.type,
				subtype: account.subtype,
			})),
			tx,
		});

		const transactionsToCreateOrUpdate = added
			.concat(modified)
			.map(transaction => {
				const account = accounts.find(
					account => account.plaid_account_id === transaction.account_id,
				);

				if (!account) {
					throw new Error('Transaction does not have an account');
				}

				return {
					account_id: account.id,
					user_id: userId,
					amount: String(transaction.amount),
					iso_currency_code: transaction.iso_currency_code,
					unofficial_currency_code: transaction.unofficial_currency_code,
					name: transaction.name,
					pending: transaction.pending,
					payment_channel: transaction.payment_channel,
					logo_url: transaction.logo_url,
					authorized_data: transaction.authorized_date,
					plaid_transaction_id: transaction.transaction_id,
					category: transaction.personal_finance_category?.primary,
					subcategory: transaction.personal_finance_category?.detailed,
					is_active: true,
				};
			});

		await createOrUpdateTransactions({
			plaidTransactions: transactionsToCreateOrUpdate,
			tx,
		});
		await deleteTransactions({
			deletableTransactions: removed.map(
				transaction => transaction.transaction_id,
			),
			tx,
		});
		await updateBankConnection({
			bankConnectionId: bankConnection.plaid_item_id,
			data: {
				transaction_cursor: cursor,
			},
			tx,
		});
	});

	return redirect('/overview');
}
