import { json, type ActionFunctionArgs } from '@remix-run/node';
import { generateLinkToken, isPliadError } from '~/app/services/plaid.server';
import { requireUser } from '~/app/utils/auth.server';

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request);
	try {
		const { link_token } = await generateLinkToken({
			userId: user.id,
			request,
		});

		return json(
			{
				data: {
					link_token,
				},
				status: 'success',
			} as const,
			{ status: 200 },
		);
	} catch (err) {
		let error;
		if (isPliadError(err)) {
			error = {
				code: err.error_code,
				displayMessage: err.display_message,
				message: err.error_message,
			};
		} else {
			error = {
				code: 'unknown',
				displayMessage: 'An unknown error occurred',
				message: 'An unknown error occurred',
			};
		}

		return json({ errors: error, status: 'error' } as const, { status: 400 });
	}
}
