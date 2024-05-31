import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import { type ActionFunctionArgs, json, redirect } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { z } from 'zod';
import { Field } from '~/app/components/forms';
import { Button } from '~/app/components/ui/button';
import { sendEmail } from '~/app/utils/email.server';
import { SignupEmail } from '~/app/utils/emailTemplates';
import { SignupSchema } from '~/app/utils/validation-schemas';
import { db } from '~/db/index.server';
import { prepareOtpVerification } from './verify.server';

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
		<div className="flex w-full items-center justify-center py-52">
			<div>
				<h1 className="mb-5 text-4xl font-bold">Signup</h1>
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

					<Button type="submit">Submit</Button>
				</Form>
			</div>
		</div>
	);
}
