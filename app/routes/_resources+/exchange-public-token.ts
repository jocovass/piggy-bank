import { parseWithZod } from '@conform-to/zod';
import { type ActionFunctionArgs, redirect } from '@remix-run/node';
import invariant from 'tiny-invariant';
import { z } from 'zod';
import {
	createBankConnection,
	getConsentExpirationDate,
} from '~/app/persistance/bank-connections';
import {
	exchangePublicToken,
	getInstitutionById,
	getItem,
} from '~/app/services/plaid.server';
import { requireUser } from '~/app/utils/auth.server';

const schema = z.object({
	publicToken: z.string(),
	userId: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
	await requireUser(request);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, { schema, async: true });

	if (submission.status !== 'success') {
		return redirect('/');
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

	await createBankConnection({
		access_token: tokenResponse.access_token,
		item_id: itemResponse.item.item_id,
		institution_id: institutionsResponse.institution.institution_id,
		name: institutionsResponse.institution.name,
		user_id: userId,
		consent_expiration_time: getConsentExpirationDate(
			itemResponse.item.consent_expiration_time,
		),
		logo: institutionsResponse.institution.logo,
		primary_color: institutionsResponse.institution.primary_color,
		// tokransaction_cursor
	});

	return redirect('/');
}
