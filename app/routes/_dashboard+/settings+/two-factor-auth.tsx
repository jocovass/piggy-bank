import { parseWithZod } from '@conform-to/zod';
import { generateTOTP } from '@epic-web/totp';
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
	redirect,
} from '@remix-run/node';
import { Form, NavLink, useFetcher, useLoaderData } from '@remix-run/react';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { Button } from '~/app/components/ui/button';
import { requireUser } from '~/app/utils/auth.server';
import { createToastHeader } from '~/app/utils/toast.server';
import { db } from '~/db/index.server';
import { verifications } from '~/db/schema';
import { twoFactorAuthVerifyType } from './two-factor-auth_.verify';

export const twoFactorAuthType = '2fa';
export const schema = z.object({
	intent: z.enum(['enable', 'disable'], {
		required_error: 'Intent is required',
		invalid_type_error: 'Intent must be enable or disable',
	}),
});

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request);
	const twoFacotorEnabled = await db.query.verifications.findFirst({
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

	const { intent } = submission.value;

	const twoFacotorEnabled = await db.query.verifications.findFirst({
		where: and(
			eq(verifications.target, user.id),
			eq(verifications.type, twoFactorAuthType),
		),
	});

	if (intent === 'enable') {
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

	if (intent === 'disable') {
		await db
			.delete(verifications)
			.where(
				and(
					eq(verifications.target, user.id),
					eq(verifications.type, twoFactorAuthType),
				),
			);

		return json(
			{},
			{
				headers: await createToastHeader({
					title: '2FA Disabled',
					description: 'Successfully disabled 2FA',
					type: 'success',
				}),
			},
		);
	}

	return json(
		{
			data: submission.reply({ formErrors: ['Disable not yet implemented'] }),
		},
		{ status: 400 },
	);
}

export default function TwoFactorAuth() {
	const { twoFacotorEnabled } = useLoaderData<typeof loader>();
	const fetcher = useFetcher();

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
					<Button
						onClick={() => {
							const form = new FormData();
							form.append('intent', 'disable');
							fetcher.submit(form, {
								method: 'POST',
							});
						}}
					>
						{fetcher.state !== 'loading' ? 'Disable 2FA' : 'Disabling...'}
					</Button>
				</div>
			)}
			<NavLink to="/settings/password">Back to passwords</NavLink>
		</div>
	);
}
