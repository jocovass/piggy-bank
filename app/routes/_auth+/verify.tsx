import {
	getFormProps,
	getInputProps,
	useForm,
	useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { UTCDate } from '@date-fns/utc';
import { verifyTOTP } from '@epic-web/totp';
import { type ActionFunctionArgs, json, redirect } from '@remix-run/node';
import { Form, useActionData, useSearchParams } from '@remix-run/react';
import { and, eq } from 'drizzle-orm';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { z } from 'zod';
import { Button } from '~/app/components/ui/button';
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '~/app/components/ui/input-otp';
import { VerifySchema } from '~/app/utils/validation-schemas';
import { verifySessionStorage } from '~/app/utils/verification.server';
import { db } from '~/db/index.server';
import { verifications } from '~/db/schema';
import { onboardingEmailSessionKey } from './onboarding';

export const verifyTypeParamKey = 'type';
export const verifyTargetParamKey = 'target';
export const verifyRedirectToParamKey = 'redirectTo';
export const verifyCodeParamKey = 'otp';
export const type = [
	'onboarding',
	'2fa',
	'reset-password',
	'change-email',
] as const;

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: VerifySchema.superRefine(async (data, ctx) => {
			const verification = await db.query.verifications.findFirst({
				columns: {
					algorithm: true,
					charSet: true,
					digits: true,
					period: true,
					secret: true,
				},
				where: (verification, { and, eq, gt }) =>
					and(
						eq(verification.target, data.target),
						eq(verification.type, data.type),
						gt(verification.expiresAt, new UTCDate()),
					),
			});

			if (!verification) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['otp'],
					message: 'Invalid verification code',
				});
				return;
			}

			const result = verifyTOTP({
				otp: data.otp,
				...verification,
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

	const { target, type } = submission.value;

	await db
		.delete(verifications)
		.where(and(eq(verifications.target, target), eq(verifications.type, type)));

	const verifySession = await verifySessionStorage.getSession();
	verifySession.set(onboardingEmailSessionKey, submission.value.target);

	return redirect('/onboarding', {
		headers: {
			'Set-Cookie': await verifySessionStorage.commitSession(verifySession),
		},
	});
}

export default function Verify() {
	const actionData = useActionData<typeof action>();
	const [searchParams] = useSearchParams();
	const [form, fields] = useForm({
		constraint: getZodConstraint(VerifySchema),
		defaultValue: {
			target: searchParams.get(verifyTargetParamKey),
			type: searchParams.get(verifyTypeParamKey),
			redirectTo: searchParams.get(verifyRedirectToParamKey),
		},
		lastResult: actionData?.data,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: VerifySchema });
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	});
	const otp = useInputControl(fields.otp);

	const onChange = (value: string) => otp.change(value.toUpperCase());

	return (
		<div className="flex w-full items-center justify-center py-52">
			<div>
				<h1 className="mb-5 text-4xl font-bold">Verify Route</h1>
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
					<input {...getInputProps(fields.target, { type: 'hidden' })} />
					<input {...getInputProps(fields.type, { type: 'hidden' })} />
					<input {...getInputProps(fields.redirectTo, { type: 'hidden' })} />
					<Button type="submit">Submit</Button>
				</Form>
			</div>
		</div>
	);
}
