import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';
import { Form } from '@remix-run/react';
import { and, eq } from 'drizzle-orm';
import { Button } from '~/app/components/ui/button';
import {
	unverifiedsessionidkey,
	verifiedTimeKey,
} from '~/app/routes/_auth+/login.server';
import { generateRedirectUrl } from '~/app/routes/_auth+/verify.server';
import { requireUser } from '~/app/utils/auth.server';
import { authSessionStorage } from '~/app/utils/session.server';
import { redirectWithToast } from '~/app/utils/toast.server';
import { verifySessionStorage } from '~/app/utils/verification.server';
import { db } from '~/db/index.server';
import { type User, verifications } from '~/db/schema';
import { twoFactorAuthType } from './two-factor-auth';

export async function shouldRequestTwoFA(request: Request, user?: User) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('Cookie'),
	);
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('Cookie'),
	);

	if (verifySession.has(unverifiedsessionidkey)) return true;
	const _user = user ?? (await requireUser(request));
	if (!_user) return false;

	const twoFacotorEnabled = await db.query.verifications.findFirst({
		where: and(
			eq(verifications.target, _user.id),
			eq(verifications.type, twoFactorAuthType),
		),
	});

	if (!twoFacotorEnabled) return false;
	const verifiedTime = authSession.get(verifiedTimeKey) ?? new Date(0);
	const twoHours = 1000 * 60 * 2;
	return Date.now() - verifiedTime > twoHours;
}

export async function requireRecentTwoFactorAuth(
	request: Request,
	user?: User,
) {
	const _user = user ?? (await requireUser(request));
	const shouldReverify = await shouldRequestTwoFA(request, _user);

	if (shouldReverify) {
		const url = new URL(request.url);
		const redirectUrl = generateRedirectUrl({
			request,
			target: _user.id,
			type: twoFactorAuthType,
			redirectUrl: url.pathname + url.search,
		});

		redirectWithToast(redirectUrl.toString(), {
			title: 'Please Reverify',
			description: '2FA is required for this action.',
		});
	}
}

export async function loader({ request }: LoaderFunctionArgs) {
	await requireRecentTwoFactorAuth(request);
	return json({});
}

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request);
	await requireRecentTwoFactorAuth(request, user);
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
