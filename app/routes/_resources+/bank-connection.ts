import { parseWithZod } from '@conform-to/zod';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import {
	getBankConnectionByItemId,
	getConsentExpirationDate,
	updateBankConnection,
} from '~/app/data-access/bank-connections';
import { getItem, isPliadError } from '~/app/services/plaid.server';
import { requireUser } from '~/app/utils/auth.server';
import { createToastHeader } from '~/app/utils/toast.server';
import { ItemSchema } from '~/app/utils/validation-schemas';

export async function action({ request }: ActionFunctionArgs) {
	await requireUser(request);
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
		columns: { access_token: true, id: true },
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
		const response = await getItem({
			accessToken: bankConnection.access_token,
		});

		const { consent_expiration_time } = response.item;

		await updateBankConnection({
			bankConnectionId: bankConnection.id,
			data: {
				consent_expiration_time: getConsentExpirationDate(
					consent_expiration_time,
				),
			},
		});
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
