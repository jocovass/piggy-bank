import {
	getFormProps,
	getInputProps,
	useForm,
	useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { type ActionFunctionArgs, json } from '@remix-run/node';
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
import { OTPSchema, RedirectSchema } from '~/app/utils/validation-schemas';
import { db } from '~/db/index.server';
import { verifications } from '~/db/schema';
import { handleTwoFAVerification } from './login.server';
import { handleOnbaordingVerification } from './onboarding.server';
import { isOtpCodeValid } from './verify.server';

export const verifyTypeParamKey = 'type';
export const verifyTargetParamKey = 'target';
export const verifyRedirectToParamKey = 'redirectTo';
export const verifyCodeParamKey = 'otp';
export const type = [
	'onboarding',
	'2fa',
	'2fa-verify',
	'reset-password',
	'change-email',
] as const;

export const VerificationTypeSchema = z.enum(type);
export const VerifySchema = z
	.object({
		target: z.string(),
		type: VerificationTypeSchema,
		redirectTo: RedirectSchema,
	})
	.merge(OTPSchema);

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: VerifySchema.superRefine(async (data, ctx) => {
			const isValid = await isOtpCodeValid({
				otp: data.otp,
				target: data.target,
				type: data.type,
			});

			if (!isValid) {
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

	async function deleteVerification() {
		await db
			.delete(verifications)
			.where(
				and(eq(verifications.target, target), eq(verifications.type, type)),
			);
	}

	if (type === 'onboarding') {
		await deleteVerification();
		return await handleOnbaordingVerification({ email: target, request });
	} else if (type === '2fa') {
		return await handleTwoFAVerification({
			body: formData,
			request,
			submission,
		});
	}
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
