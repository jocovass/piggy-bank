import { parseWithZod } from '@conform-to/zod';
import { UTCDate } from '@date-fns/utc';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import { createAccounts } from '~/app/data-access/accounts';
import {
	getBankConnectionByItemId,
	updateBankConnection,
} from '~/app/data-access/bank-connections';
import {
	createOrUpdateTransactions,
	deleteTransactions,
} from '~/app/data-access/transactions';
import {
	fetchTransactions,
	getAccounts as getAccountsFromPlaid,
	isPliadError,
} from '~/app/services/plaid.server';
import { requireUser } from '~/app/utils/auth.server';
import { createToastHeader } from '~/app/utils/toast.server';
import { ItemSchema } from '~/app/utils/validation-schemas';
import { db } from '~/db/index.server';

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request);
	const form = await request.formData();
	const submission = await parseWithZod(form, {
		schema: ItemSchema.required(),
		async: true,
	});

	if (submission.status !== 'success') {
		const { error } = submission;
		const errorMessage = error?.itemId
			? error.itemId[0]
			: 'An unknown error occurred';

		return json({ status: 'error' } as const, {
			headers: await createToastHeader({
				title: 'Invalid request',
				description: errorMessage,
				type: 'error',
			}),
			status: 400,
		});
	}

	const { itemId } = submission.value;

	const bankConnection = await getBankConnectionByItemId({
		itemId,
		columns: { access_token: true, id: true, transaction_cursor: true },
	});

	if (!bankConnection) {
		return json({ status: 'error' } as const, {
			headers: await createToastHeader({
				title: 'Invalid request',
				description: 'Item does not exist.',
				type: 'error',
			}),
			status: 400,
		});
	}

	try {
		const accountsResponse = await getAccountsFromPlaid({
			accessToken: bankConnection.access_token,
		});

		const { added, cursor, modified, removed } = await fetchTransactions({
			accessToken: bankConnection.access_token,
			cursor: bankConnection.transaction_cursor,
		});

		await db.transaction(async tx => {
			const createdAccounts = await createAccounts({
				plaidAccounts: accountsResponse.accounts.map(account => ({
					bank_connection_id: bankConnection.id,
					user_id: user.id,
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
					const account = createdAccounts.find(
						account => account.plaid_account_id === transaction.account_id,
					);

					if (!account) {
						throw new Error('Transaction does not have an account');
					}

					return {
						account_id: account.id,
						user_id: user.id,
						amount: String(transaction.amount),
						iso_currency_code: transaction.iso_currency_code,
						unofficial_currency_code: transaction.unofficial_currency_code,
						name: transaction.name,
						pending: transaction.pending,
						payment_channel: transaction.payment_channel,
						logo_url: transaction.logo_url,
						authorized_date: new UTCDate(
							transaction.authorized_date || UTCDate.now(),
						),
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
				bankConnectionId: bankConnection.id,
				data: {
					transaction_cursor: cursor,
				},
				tx,
			});
		});

		return json(null);
	} catch (err) {
		if (isPliadError(err)) {
			return json({ status: 'error' } as const, {
				headers: await createToastHeader({
					title: 'Invalid request',
					description: err.display_message || err.error_message,
					type: 'error',
				}),
				status: 400,
			});
		}

		return json({ status: 'error' } as const, {
			headers: await createToastHeader({
				title: 'Update failed',
				description: 'Something went wrong, please try again later.',
				type: 'error',
			}),
			status: 400,
		});
	}
}
