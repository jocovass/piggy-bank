import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import { UTCDate } from '@date-fns/utc';
import { generateTOTP } from '@epic-web/totp';
import { type ActionFunctionArgs, json, redirect } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { z } from 'zod';
import { Field } from '~/app/components/forms';
import { Button } from '~/app/components/ui/button';
import { sendEmail } from '~/app/utils/email.server';
import { SignupEmail } from '~/app/utils/emailTemplates';
import {
	verificationMaxAge,
	verifySessionStorage,
} from '~/app/utils/verification.server';
import { db } from '~/db/index.server';
import { verifications } from '~/db/schema';
import { onboardingEmailSessionKey } from './onboarding';

const schema = z.object({
	email: z
		.string({ required_error: 'Email is required' })
		.email('Email is invalid'),
});

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: schema.superRefine(async (data, ctx) => {
			const existingUser = await db.query.users.findFirst({
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
	const session = await verifySessionStorage.getSession();
	session.set(onboardingEmailSessionKey, email);

	const { otp, ...verifcationConfig } = generateTOTP({
		algorithm: 'SHA256',
		charSet: 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789',
		period: verificationMaxAge,
	});

	const verificationConfig = {
		...verifcationConfig,
		type: 'onboarding',
		target: email,
		expiresAt: new UTCDate(Date.now() + verificationMaxAge * 1000),
	};
	await db
		.insert(verifications)
		.values(verificationConfig)
		.onConflictDoUpdate({
			target: [verifications.target, verifications.type],
			set: verificationConfig,
		});

	const result = await sendEmail({
		subject: 'Welcome to Piggy Bank',
		to: email,
		react: <SignupEmail otp={otp} onboardingUrl="/onboarding" />,
	});

	if (result.status === 'error') {
		return json(
			{ data: submission.reply({ formErrors: [result.error.message] }) },
			{ status: result.error.statusCode },
		);
	}

	return redirect('/onboarding', {
		headers: {
			'Set-Cookie': await verifySessionStorage.commitSession(session),
		},
	});
}

export default function SignupRoute() {
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		id: 'signup-form',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.data,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema });
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
