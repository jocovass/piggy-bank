import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { z } from 'zod';
import { Field } from '~/app/components/forms';
import { Button } from '~/app/components/ui/button';
import { createLoginSession, requireAnonymus } from '~/app/utils/auth.server';
import { EmailSchema, RememberSchema } from '~/app/utils/validation-schemas';
import { handleNewSession } from './login.server';

export const LoginSchema = z.object({
	email: EmailSchema,
	password: z.string({ required_error: 'Password is required' }),
	remember: RememberSchema,
});

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAnonymus(request);
	return json({});
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: intent =>
			LoginSchema.transform(async (data, { addIssue }) => {
				if (intent !== null) return { ...data, session: null };
				const session = await createLoginSession(data);

				if (!session) {
					addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Invalid email or password',
					});
					return z.NEVER;
				}

				return { ...data, session };
			}),
		async: true,
	});

	if (submission.status !== 'success' || !submission.value.session) {
		return json(
			{ data: submission.reply({ hideFields: ['password'] }) },
			{ status: submission.status === 'error' ? 400 : 200 },
		);
	}

	const { session, remember } = submission.value;

	console.log('BEFORE HANDLE NEW SESSION 💥');

	return handleNewSession({ remember, request, session });
}

export default function LoginRoute() {
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		id: 'login-form',
		constraint: getZodConstraint(LoginSchema),
		lastResult: actionData?.data,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: LoginSchema });
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	});

	return (
		<div className="flex w-full items-center justify-center py-52">
			<div>
				<h1 className="mb-5 text-4xl font-bold">Login</h1>
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

					<Field
						errors={fields.password.errors}
						inputProps={getInputProps(fields.password, { type: 'password' })}
						labelProps={{ children: 'Password', htmlFor: fields.password.id }}
					/>

					<Button type="submit">Submit</Button>
				</Form>

				<Form action="/auth/github" method="POST">
					<Button>Login with GitHub</Button>
				</Form>
			</div>
		</div>
	);
}
