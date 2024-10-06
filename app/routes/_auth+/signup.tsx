import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import { type ActionFunctionArgs, json, redirect } from '@remix-run/node';
import { Form, NavLink, useActionData } from '@remix-run/react';
import { z } from 'zod';
import { Field } from '~/app/components/forms';
import { Button } from '~/app/components/ui/button';
import ThemeSwitch from '~/app/routes/_resources+/theme-switch';
import { sendEmail } from '~/app/utils/email.server';
import { SignupEmail } from '~/app/utils/emailTemplates';
import { EmailSchema } from '~/app/utils/validation-schemas';
import { db } from '~/db/index.server';
import { prepareOtpVerification } from './verify.server';

export const SignupSchema = z.object({
	email: EmailSchema,
});

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: SignupSchema.superRefine(async (data, ctx) => {
			const existingUser = await db.query.users.findFirst({
				columns: { id: true },
				where: (user, { eq }) => eq(user.email, data.email),
			});

			if (existingUser) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['email'],
					message: 'A user already exists with this email',
				});
				return;
			}
		}),
		async: true,
	});

	if (submission.status !== 'success') {
		return json(
			{ data: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		);
	}

	const { email } = submission.value;

	const { otp, redirectUrl, verifyUrl } = await prepareOtpVerification({
		request,
		target: email,
		type: 'onboarding',
	});

	const result = await sendEmail({
		subject: 'Welcome to Piggy Bank',
		to: email,
		react: <SignupEmail otp={otp} onboardingUrl={verifyUrl.toString()} />,
	});

	if (result.status === 'error') {
		return json(
			{ data: submission.reply({ formErrors: [result.error.message] }) },
			{ status: result.error.statusCode },
		);
	}

	return redirect(redirectUrl.toString());
}

export default function SignupRoute() {
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		id: 'signup-form',
		constraint: getZodConstraint(SignupSchema),
		lastResult: actionData?.data,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SignupSchema });
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	});

	return (
		<div className="flex min-h-screen flex-col lg:p-8 lg:pb-16">
			<div className="flex">
				<ThemeSwitch />
				<Button asChild className="ml-auto" variant="ghost">
					<NavLink to="/login">Login</NavLink>
				</Button>
			</div>

			<div className="mx-auto flex w-full flex-1 flex-col justify-center space-y-6 sm:w-[350px]">
				<div className="text-center">
					<h1 className="text-2xl font-semibold tracking-tight">
						Create an account
					</h1>
					<p className="text-sm text-muted-foreground">
						Enter your email below to create your account
					</p>
				</div>

				<Form method="POST" {...getFormProps(form)}>
					<div id={form.errorId}>{form.errors}</div>
					<Field
						errors={fields.email.errors}
						inputProps={{
							...getInputProps(fields.email, { type: 'email' }),
							autoComplete: 'email',
							autoFocus: true,
						}}
						labelProps={{ children: 'Email', htmlFor: fields.email.id }}
					/>

					<Button type="submit" className="mt-4 w-full">
						Signup
					</Button>
				</Form>

				<div className="text-center">
					<p className="px-8 text-center text-sm text-muted-foreground">
						By clicking continue, you agree to our{' '}
						<NavLink
							to="/terms"
							className="underline underline-offset-4 hover:text-primary"
						>
							Terms of Service
						</NavLink>{' '}
						and{' '}
						<NavLink
							to="/privacy"
							className="underline underline-offset-4 hover:text-primary"
						>
							Privacy Policy
						</NavLink>
						.
					</p>
				</div>
			</div>
		</div>
	);
}
