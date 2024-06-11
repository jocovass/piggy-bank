import { getFormProps, useForm, useInputControl } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { verifyTOTP, getTOTPAuthUri } from '@epic-web/totp';
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	redirect,
} from '@remix-run/node';
import { Form, NavLink, useActionData, useLoaderData } from '@remix-run/react';
import { and, eq } from 'drizzle-orm';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import QrCode from 'qrcode';
import { z } from 'zod';
import { Button } from '~/app/components/ui/button';
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '~/app/components/ui/input-otp';
import { requireUser } from '~/app/utils/auth.server';
import { getDomainUrl } from '~/app/utils/misc';
import { redirectWithToast } from '~/app/utils/toast.server';
import { OTPSchema } from '~/app/utils/validation-schemas';
import { db } from '~/db/index.server';
import { verifications } from '~/db/schema';
import { twoFactorAuthType } from './two-factor-auth';

export const twoFactorAuthVerifyType = '2fa-verify';
export const schema = z.union([
	z.object({
		intent: z.literal('cancel'),
	}),
	z
		.object({
			intent: z.literal('verify'),
		})
		.merge(OTPSchema),
]);

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request);
	const twoFactorVerify = await db.query.verifications.findFirst({
		columns: {
			id: true,
			algorithm: true,
			digits: true,
			period: true,
			secret: true,
		},
		where: (verification, { and, eq }) =>
			and(
				eq(verification.target, user.id),
				eq(verification.type, twoFactorAuthVerifyType),
			),
	});

	if (!twoFactorVerify) {
		return redirect('/settings/two-factor-auth');
	}

	const issuer = new URL(getDomainUrl(request)).host;
	const url = getTOTPAuthUri({
		...twoFactorVerify,
		accountName: user.email,
		issuer,
	});

	const qrCode = await QrCode.toDataURL(url);

	return json({ url, qrCode });
}

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: schema.superRefine(async (data, ctx) => {
			if (data.intent === 'cancel') {
				return;
			}

			const twoFactorVerify = await db.query.verifications.findFirst({
				columns: {
					algorithm: true,
					charSet: true,
					digits: true,
					secret: true,
				},
				where: (verification, { and, eq }) =>
					and(
						eq(verification.target, user.id),
						eq(verification.type, twoFactorAuthVerifyType),
					),
			});

			if (!twoFactorVerify) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['otp'],
					message: 'Invalid verification code',
				});
				return;
			}

			const result = verifyTOTP({
				otp: data.otp,
				...twoFactorVerify,
			});

			if (!result) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['otp'],
					message: 'Invalid verification code',
				});

				return;
			}
		}),
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

	if (intent === 'cancel') {
		await db
			.delete(verifications)
			.where(
				and(
					eq(verifications.target, user.id),
					eq(verifications.type, twoFactorAuthVerifyType),
				),
			);

		return redirect('/settings/two-factor-auth');
	}

	await db
		.update(verifications)
		.set({
			type: twoFactorAuthType,
		})
		.where(
			and(
				eq(verifications.target, user.id),
				eq(verifications.type, twoFactorAuthVerifyType),
			),
		);

	return redirectWithToast('/settings/two-factor-auth', {
		title: '2FA Enabled',
		description: 'You can now login with 2FA',
		type: 'success',
	});
}

export default function TwoFactorAuthVerify() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		constraint: getZodConstraint(OTPSchema),
		lastResult: actionData?.data,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: OTPSchema });
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	});
	const otp = useInputControl(fields.otp);

	const onChange = (value: string) => otp.change(value.toUpperCase());

	return (
		<div>
			<h1>Verify 2FA</h1>
			<p>You can verify your 2FA by entering the code below.</p>
			<p>
				Scan the QR code with your authenticator app or enter the URL below.
			</p>

			<p className="bg-blue-200">{data.url}</p>

			<img alt="qr code" src={data.qrCode} className="h-56 w-56" />

			<Form method="POST" {...getFormProps(form)}>
				<InputOTP
					maxLength={6}
					pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
					name={fields.otp.name}
					value={otp.value}
					onChange={onChange}
					onBlur={otp.blur}
					onFocus={otp.focus}
					type="text"
				>
					<InputOTPGroup>
						<InputOTPSlot index={0} />
						<InputOTPSlot index={1} />
						<InputOTPSlot index={2} />
						<InputOTPSlot index={3} />
						<InputOTPSlot index={4} />
						<InputOTPSlot index={5} />
					</InputOTPGroup>
				</InputOTP>
				<Button type="submit">Submit</Button>
				<Button asChild type="button">
					<NavLink to="/settings/two-factor-auth">Cancel</NavLink>
				</Button>
			</Form>
		</div>
	);
}
