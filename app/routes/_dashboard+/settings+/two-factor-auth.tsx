import { parseWithZod } from '@conform-to/zod';
import { generateTOTP } from '@epic-web/totp';
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
	redirect,
} from '@remix-run/node';
import { Form, NavLink, useLoaderData } from '@remix-run/react';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { Button } from '~/app/components/ui/button';
import { requireUser } from '~/app/utils/auth.server';
import { db } from '~/db/index.server';
import { verifications } from '~/db/schema';
import { twoFactorAuthVerifyType } from './two-factor-auth_.verify';

export const verifiedTimeKey = 'verified-time';
export const unverifiedsessionIdKey = 'unverified-session-id';
export const twoFactorAuthType = '2fa';

export const schema = z.object({
	intent: z.enum(['enable'], {
		required_error: 'Intent is required',
		invalid_type_error: 'Invalid intent',
	}),
});

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request);
	const twoFacotorEnabled = await db.query.verifications.findFirst({
		columns: { id: true },
		where: and(
			eq(verifications.target, user.id),
			eq(verifications.type, twoFactorAuthType),
		),
	});

	return json({ twoFacotorEnabled });
}

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema,
		async: true,
	});

	if (submission.status !== 'success') {
		return json(
			{ data: submission.reply() },
			{
				status: submission.status === 'error' ? 400 : 200,
			},
		);
	}

	const twoFacotorEnabled = await db.query.verifications.findFirst({
		columns: { id: true },
		where: and(
			eq(verifications.target, user.id),
			eq(verifications.type, twoFactorAuthType),
		),
	});

	if (twoFacotorEnabled) {
		return json(
			{
				data: submission.reply({ formErrors: ['2FA is already enabled'] }),
			},
			{ status: 400 },
		);
	}

	const { otp, ...totpConfig } = generateTOTP();

	const verificationConfig = {
		...totpConfig,
		type: twoFactorAuthVerifyType,
		target: user.id,
	};
	await db
		.insert(verifications)
		.values(verificationConfig)
		.onConflictDoUpdate({
			target: [verifications.target, verifications.type],
			set: verificationConfig,
		});

	return redirect('/settings/two-factor-auth/verify');
}

export default function TwoFactorAuth() {
	const { twoFacotorEnabled } = useLoaderData<typeof loader>();

	return (
		<div>
			<h1>2FA</h1>
			{!twoFacotorEnabled && (
				<div>
					<p>
						Two factor auth is not enabled for this account. You can enable it
						by clicking the button below.
					</p>
					<Form method="POST">
						<Button type="submit" name="intent" value="enable">
							Enable 2FA
						</Button>
					</Form>
				</div>
			)}
			{twoFacotorEnabled && (
				<div>
					<p>
						Two factor auth is enabled for this account. You can disable it by
						clicking the button below.
					</p>
					<Button asChild>
						<NavLink to="/settings/two-factor-auth/disable">
							Disable 2FA
						</NavLink>
					</Button>
				</div>
			)}
			<NavLink to="/settings/password">Back to passwords</NavLink>
		</div>
	);
}
