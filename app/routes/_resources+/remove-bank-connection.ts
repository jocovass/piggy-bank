import { parseWithZod } from '@conform-to/zod';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import { z } from 'zod';
import { updateAccount } from '~/app/persistance/accounts';
import { updatedBankConnection } from '~/app/persistance/bank-connections';
import { updateTransaction } from '~/app/persistance/transactions';
import { removeItem } from '~/app/services/plaid.server';
import { requireUser } from '~/app/utils/auth.server';
import { createToastHeader } from '~/app/utils/toast.server';
import { db } from '~/db/index.server';

const schema = z.object({
	id: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
	await requireUser(request);
	const form = await request.formData();
	const submission = await parseWithZod(form, {
		async: true,
		schema,
	});

	const id = submission.status === 'success' ? submission.value.id : undefined;
	const bankConnection = id
		? await db.query.bankConnections.findFirst({
				columns: { access_token: true, id: true, plaid_item_id: true },
				where: (bankConnection, { eq }) => eq(bankConnection.id, id),
			})
		: undefined;

	if (submission.status !== 'success' || !bankConnection) {
		return json(
			{},
			{
				status: 400,
				headers: await createToastHeader({
					title: 'Invalid request',
					description: 'Cannot find bank connection',
					type: 'error',
				}),
			},
		);
	}

	try {
		await db.transaction(async transaction => {
			await removeItem({ accessToken: bankConnection.access_token });
			await updatedBankConnection(
				bankConnection.id,
				{
					is_active: false,
				},
				transaction,
			);
			const accounts = await updateAccount(
				bankConnection.id,
				{ is_active: false },
				transaction,
			);

			if (accounts.length) {
				await updateTransaction(
					accounts.map(account => account.id),
					{
						is_active: false,
					},
					transaction,
				);
			}
		});
	} catch (error) {
		console.error(error);
		return json(
			{},
			{
				status: 400,
				headers: await createToastHeader({
					title: 'Request failed',
					description: 'Something went wrong while deleting bank account',
					type: 'error',
				}),
			},
		);
	}

	return json(
		{},
		{
			status: 200,
			headers: await createToastHeader({
				title: 'Success',
				description: 'Bank connection deleted',
				type: 'success',
			}),
		},
	);
}
