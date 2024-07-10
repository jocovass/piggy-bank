import { parseWithZod } from '@conform-to/zod';
import { json, type ActionFunctionArgs } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { z } from 'zod';
import LaunchLink from '~/app/components/launch-link';
import { Button } from '~/app/components/ui/button';
import { generateLinkToken, isPliadError } from '~/app/services/plaid.server';
import { requireUser } from '~/app/utils/auth.server';
import { createToastHeader } from '~/app/utils/toast.server';
import { useUser } from '~/app/utils/user';

const schema = z.object({
	itemId: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request);
	const form = await request.formData();
	const submission = await parseWithZod(form, { schema, async: true });

	try {
		const { link_token } = await generateLinkToken({
			itemId: submission.status === 'success' ? submission.value.itemId : null,
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
		console.log(err);
		let error;
		if (isPliadError(err)) {
			error = {
				code: err.error_code,
				displayMessage: err.display_message,
				message: err.error_message,
				title: 'Failed to connect bank account',
			};
		} else if (err instanceof Error && err.message === 'Item does not exist.') {
			error = {
				code: 'item-does-not-exist',
				displayMessage: 'Item does not exist.',
				message: 'Item does not exist.',
				title: 'Failed to update account',
			};
		} else {
			error = {
				code: 'unknown',
				displayMessage: 'An unknown error occurred',
				message: 'An unknown error occurred',
				title: 'Failed to connect bank account',
			};
		}

		return json({ status: 'error' } as const, {
			headers: await createToastHeader({
				title: 'Failed to connect bank account',
				description: error.displayMessage || error.message,
				type: 'error',
			}),
			status: 400,
		});
	}
}

export function AddBankAccount() {
	const generateLinkToken = useFetcher<typeof action>();
	const user = useUser();
	const linkToken =
		generateLinkToken.data?.status === 'success'
			? generateLinkToken.data.data.link_token
			: null;

	return (
		<>
			<generateLinkToken.Form method="POST" action="/generate-link-token">
				<Button type="submit">Connect account</Button>
			</generateLinkToken.Form>

			{linkToken && <LaunchLink link={linkToken} userId={user.id} />}
		</>
	);
}
