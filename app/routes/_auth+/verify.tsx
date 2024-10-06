import {
	getFormProps,
	getInputProps,
	useForm,
	useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import {
	Form,
	NavLink,
	useActionData,
	useSearchParams,
} from '@remix-run/react';
import { and, eq } from 'drizzle-orm';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { useMemo } from 'react';
import { z } from 'zod';
import { Button } from '~/app/components/ui/button';
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
	InputOTPSeparator,
} from '~/app/components/ui/input-otp';
import { handleChangeEmailVerification } from '~/app/routes/_app+/settings+/email.server';
import ThemeSwitch from '~/app/routes/_resources+/theme-switch';
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
	} else if (type === 'change-email') {
		await deleteVerification();
		return handleChangeEmailVerification({
			request,
			submission,
		});
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
	const type = searchParams.get(verifyTypeParamKey);
	const [form, fields] = useForm({
		constraint: getZodConstraint(VerifySchema),
		defaultValue: {
			target: searchParams.get(verifyTargetParamKey),
			type,
			redirectTo: searchParams.get(verifyRedirectToParamKey),
		},
		lastResult: actionData?.data,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: VerifySchema });
		},
		shouldValidate: 'onSubmit',
	});
	const otp = useInputControl(fields.otp);

	const textNodes = useMemo(() => {
		if (type === '2fa') {
			return (
				<>
					<h1 className="text-2xl font-semibold tracking-tight">Verify</h1>
					<p className="text-sm text-muted-foreground">
						Please verify your identity by entering the OTP code from you
						authenticator app
					</p>
				</>
			);
		} else if (type === 'onboarding') {
			return (
				<>
					<h1 className="text-2xl font-semibold tracking-tight">
						Verify to continue
					</h1>
					<p className="text-sm text-muted-foreground">
						Please enter the code we sent to your email address
					</p>
				</>
			);
		} else if (type === 'change-email') {
			return (
				<>
					<h1 className="text-2xl font-semibold tracking-tight">
						Verify your email address
					</h1>
					<p className="text-sm text-muted-foreground">
						Please enter the code we sent to your new email address
					</p>
				</>
			);
		}
	}, [type]);

	return (
		<div className="flex min-h-screen flex-col lg:p-8 lg:pb-16">
			<div className="flex">
				<ThemeSwitch />
				<Button asChild className="ml-auto" variant="ghost">
					<NavLink to="/signup">Signup</NavLink>
				</Button>
			</div>
			<div className="mx-auto flex w-full flex-1 flex-col items-center justify-center space-y-6 sm:w-[350px]">
				<div className="text-center">{textNodes}</div>
				<Form method="POST" {...getFormProps(form)}>
					<InputOTP
						maxLength={6}
						pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
						name={fields.otp.name}
						value={otp.value}
						onChange={value => otp.change(value.toUpperCase())}
						onBlur={otp.blur}
						onFocus={otp.focus}
						type="text"
					>
						<InputOTPGroup>
							<InputOTPSlot index={0} />
							<InputOTPSlot index={1} />
							<InputOTPSlot index={2} />
						</InputOTPGroup>
						<InputOTPSeparator />
						<InputOTPGroup>
							<InputOTPSlot index={3} />
							<InputOTPSlot index={4} />
							<InputOTPSlot index={5} />
						</InputOTPGroup>
					</InputOTP>
					<p className="pt-1 text-sm text-primary">{fields.otp.errors?.[0]}</p>
					<input {...getInputProps(fields.target, { type: 'hidden' })} />
					<input {...getInputProps(fields.type, { type: 'hidden' })} />
					<input {...getInputProps(fields.redirectTo, { type: 'hidden' })} />
					<Button type="submit" className="mt-8 w-full">
						Submit
					</Button>
				</Form>
			</div>
		</div>
	);
}
