import { parseWithZod } from '@conform-to/zod';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import { and, eq } from 'drizzle-orm';
import {
	getConsentExpirationDate,
	updatedBankConnection,
} from '~/app/persistance/bank-connections';
import { getItem, isPliadError } from '~/app/services/plaid.server';
import { requireUser } from '~/app/utils/auth.server';
import { createToastHeader } from '~/app/utils/toast.server';
import { ItemSchema } from '~/app/utils/validation-schemas';
import { db } from '~/db/index.server';
import { bankConnections } from '~/db/schema';

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
	const bankConnection = await db.query.bankConnections.findFirst({
		columns: { access_token: true },
		where: and(
			eq(bankConnections.user_id, user.id),
			eq(bankConnections.item_id, itemId),
			eq(bankConnections.is_active, true),
		),
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

		const { item_id, consent_expiration_time } = response.item;

		await updatedBankConnection(item_id, {
			consent_expiration_time: getConsentExpirationDate(
				consent_expiration_time,
			),
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
