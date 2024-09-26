import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { type ActionFunctionArgs, json, redirect } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { z } from 'zod';
import { Field } from '~/app/components/forms';
import Spinner from '~/app/components/icons/spinner';
import { Button } from '~/app/components/ui/button';
import { getUserByEmail } from '~/app/data-access/users';
import { prepareOtpVerification } from '~/app/routes/_auth+/verify.server';
import { requireUser } from '~/app/utils/auth.server';
import { useDelayedIsPending } from '~/app/utils/misc';
import { useUser } from '~/app/utils/user';
import { EmailSchema } from '~/app/utils/validation-schemas';

const schema = z.object({
	email: EmailSchema,
});

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request);
	const form = await request.formData();
	const submission = await parseWithZod(form, {
		schema: schema.superRefine(async ({ email }, ctx) => {
			const user = await getUserByEmail({ email });

			if (user) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Email already exists',
					path: ['email'],
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

	const { email } = submission.value;

	const { otp, redirectUrl, verifyUrl } = await prepareOtpVerification({
		request,
		target: user.id,
		type: 'change-email',
	});

	console.log({ otp, redirectUrl, verifyUrl });

	return redirect(redirectUrl.toString());
}

export default function Email() {
	const user = useUser();
	const actionData = useActionData<typeof action>();
	const isPending = useDelayedIsPending();
	const [form, fields] = useForm({
		id: 'email-settings-form',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.data,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema });
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	});
	const disableSaveBtn = !fields.email.value || isPending;

	return (
		<div>
			<div className="mb-5">
				<p>You will receive an email at the new email address to confirm.</p>
				<p>
					An email notice will also be sent to your old address{' '}
					<b>{user.email}</b>.
				</p>
			</div>
			<Form method="POST" {...getFormProps(form)}>
				<Field
					errors={fields.email.errors}
					inputProps={{
						...getInputProps(fields.email, { type: 'text' }),
						placeholder: 'Email',
					}}
					labelProps={{
						children: 'Email Address',
						htmlFor: fields.email.id,
					}}
				/>

				<Button disabled={disableSaveBtn} type="submit">
					Update
					{isPending && <Spinner className="ml-2" />}
				</Button>
			</Form>
		</div>
	);
}
