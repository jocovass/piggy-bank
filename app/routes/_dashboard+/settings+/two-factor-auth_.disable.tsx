import { type ActionFunctionArgs } from '@remix-run/node';
import { Form } from '@remix-run/react';
import { and, eq } from 'drizzle-orm';
import { Button } from '~/app/components/ui/button';
import { requireRecentTwoFactorAuth } from '~/app/routes/_auth+/verify.server';
import { requireUser } from '~/app/utils/auth.server';
import { redirectWithToast } from '~/app/utils/toast.server';
import { db } from '~/db/index.server';
import { verifications } from '~/db/schema';
import { twoFactorAuthType } from './two-factor-auth';

export async function action({ request }: ActionFunctionArgs) {
	console.log('action');
	const user = await requireUser(request);
	console.log('user', user);
	await requireRecentTwoFactorAuth(request, user);
	console.log('after requireRecentTwoFactorAuth');

	await db
		.delete(verifications)
		.where(
			and(
				eq(verifications.target, user.id),
				eq(verifications.type, twoFactorAuthType),
			),
		);

	return redirectWithToast('/settings/two-factor-auth', {
		title: '2FA disabled',
		description: '2FA is now disabled for this account.',
		type: 'success',
	});
}

export default function TwoFactorAuthDisable() {
	return (
		<div>
			<p>
				Two factor auth is enabled for this account. You can disable it by
				clicking the button below.
			</p>
			<Form method="POST">
				<Button type="submit">Disable 2FA</Button>
			</Form>
		</div>
	);
}
