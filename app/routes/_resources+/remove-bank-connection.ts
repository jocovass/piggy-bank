import { parseWithZod } from '@conform-to/zod';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import { z } from 'zod';
import {
	getAccountsByBankConnectionId,
	updateAccount,
} from '~/app/data-access/accounts';
import {
	getBankConnectionById,
	updateBankConnection,
} from '~/app/data-access/bank-connections';
import { updateAccountTransactions } from '~/app/data-access/transactions';
import { removeItem } from '~/app/services/plaid.server';
import { requireUser } from '~/app/utils/auth.server';
import { createToastHeader } from '~/app/utils/toast.server';
import { db } from '~/db/index.server';

const schema = z.object({
	accountId: z.string(),
	bankConnectionId: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
	await requireUser(request);
	const form = await request.formData();
	const submission = await parseWithZod(form, {
		async: true,
		schema,
	});

	/**
	 * Check if submission data is valid and bank connection exists otherwise
	 * return 400 error.
	 */
	const bankConnectionId =
		submission.status === 'success'
			? submission.value.bankConnectionId
			: undefined;
	const accountId =
		submission.status === 'success' ? submission.value.accountId : undefined;
	const bankConnection = bankConnectionId
		? await getBankConnectionById({
				columns: { access_token: true, id: true, plaid_item_id: true },
				id: bankConnectionId,
			})
		: undefined;
	const accounts = bankConnectionId
		? await getAccountsByBankConnectionId({
				bankConnectionId: bankConnectionId,
			})
		: undefined;

	const accountToRemove = accounts?.find(account => account.id === accountId);
	if (submission.status !== 'success' || !bankConnection || !accountToRemove) {
		return json(null, {
			status: 400,
			headers: await createToastHeader({
				title: 'Invalid request',
				description: 'Account does not exist',
				type: 'error',
			}),
		});
	}

	try {
		await db.transaction(async tx => {
			/**
			 * If there are more accounts associated with the bank connection
			 * we don't want to remove the connection from plaid only mark the account
			 * and the associated transactions as inactive.
			 */
			if (accounts && accounts.length > 1) {
				await removeItem({ accessToken: bankConnection.access_token });
				await updateBankConnection({
					bankConnectionId: bankConnection.id,
					data: {
						is_active: false,
					},
					tx,
				});
			}

			const [updatedAccount] = await updateAccount({
				id: accountToRemove.id,
				data: { is_active: false },
				tx,
			});

			if (updatedAccount) {
				await updateAccountTransactions({
					accountId: updatedAccount.id,
					data: {
						is_active: false,
					},
					tx,
				});
			}
		});
	} catch (error) {
		console.error(error);
		return json(null, {
			status: 400,
			headers: await createToastHeader({
				title: 'Request failed',
				description: 'Something went wrong while removing bank account',
				type: 'error',
			}),
		});
	}

	return json(null, {
		status: 200,
		headers: await createToastHeader({
			title: 'Success',
			description: 'Bank account removed',
			type: 'success',
		}),
	});
}
