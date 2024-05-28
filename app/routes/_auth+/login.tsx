import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
	redirect,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { z } from 'zod';
import { Field } from '~/app/components/forms';
import { Button } from '~/app/components/ui/button';
import {
	createLoginSession,
	requireAnonymus,
	sessionKey,
} from '~/app/utils/auth.server';
import { authSessionStorage } from '~/app/utils/session.server';

const schema = z.object({
	email: z
		.string({ required_error: 'Email is required' })
		.email('Email is invalid'),
	password: z
		.string({ required_error: 'Password is required' })
		.min(8, 'Must be at least 8 character')
		.regex(/[A-Z]/, 'Must contain uppercase letter')
		.regex(/[a-z]/, 'Must contain uppercase letter')
		.regex(/[0-9]/, 'Must contain number')
		.regex(/[.*[!#$%&?]/, 'Must contain special character'),
	remember: z.boolean().optional(),
});

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAnonymus(request);
	return json({});
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: intent =>
			schema.transform(async (data, { addIssue }) => {
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

	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	);
	authSession.set(sessionKey, session.id);

	return redirect('/', {
		headers: {
			'Set-Cookie': await authSessionStorage.commitSession(authSession, {
				expires: remember ? session.expirationDate : undefined,
			}),
		},
	});
}

export default function LoginRoute() {
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		id: 'login-form',
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
			</div>
		</div>
	);
}
