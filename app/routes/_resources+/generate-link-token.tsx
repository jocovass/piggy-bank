import { json, type ActionFunctionArgs } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import LaunchLink from '~/app/components/launch-link';
import { Button } from '~/app/components/ui/button';
import { generateLinkToken, isPliadError } from '~/app/services/plaid.server';
import { requireUser } from '~/app/utils/auth.server';
import { useUser } from '~/app/utils/user';

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
		console.log(err);
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

		return json({ error, status: 'error' } as const, { status: 400 });
	}
}

export function AddBankAccount() {
	const generateLinkToken = useFetcher<typeof action>();
	const user = useUser();
	const linkToken =
		generateLinkToken.data?.status === 'success'
			? generateLinkToken?.data?.data.link_token
			: null;
	const errorMessage =
		generateLinkToken.state === 'idle' &&
		generateLinkToken.data?.status === 'error'
			? generateLinkToken?.data?.error.displayMessage
			: null;

	useEffect(() => {
		if (errorMessage) {
			toast.error('Failed to connect bank account', {
				description: errorMessage,
			});
		}
	}, [errorMessage]);

	return (
		<>
			<generateLinkToken.Form method="POST" action="/generate-link-token">
				<Button type="submit">Connect account</Button>
			</generateLinkToken.Form>

			{linkToken && <LaunchLink link={linkToken} userId={user.id} />}
		</>
	);
}
