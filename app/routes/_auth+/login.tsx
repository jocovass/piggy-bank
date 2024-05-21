import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
	redirect,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { Field } from '~/app/components/forms';
import { Button } from '~/app/components/ui/button';
import { sessionStorage } from '~/app/utils/session.server';
import { db } from '~/db/index.server';
import { users } from '~/db/schema';

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
});

export async function loader({ request }: LoaderFunctionArgs) {
	const session = await sessionStorage.getSession(
		request.headers.get('Cookie'),
	);
	const userId = session.get('userId');

	if (typeof userId === 'string') {
		const user = await db.query.users
			.findFirst({
				where: eq(users.id, userId),
			})
			.catch(() => {});

		if (user) {
			return redirect('/');
		}
	}

	return json({});
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema,
		// schema: schema.superRefine(async (data, ctx) => {
		// 	const user = await db.query.users.findFirst({
		// 		where: (user, { eq }) => eq(user.email, data.email),
		// 		with: { password: { columns: { hash: true } } },
		// 	});
		// 	console.log(user);
		// 	const validPassword = bcrypt.compareSync(
		// 		data.password,
		// 		user?.password.hash ?? '',
		// 	);

		// 	if (!user || !validPassword) {
		// 		ctx.addIssue({
		// 			code: z.ZodIssueCode.custom,
		// 			path: ['form'],
		// 			message: 'Invalid email or password.',
		// 		});
		// 		return;
		// 	}
		// }),
		async: true,
	});

	if (submission.status !== 'success') {
		return json(
			{ data: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		);
	}

	const { email, password } = submission.value;
	const user = await db.query.users.findFirst({
		where: (user, { eq }) => eq(user.email, email),
		with: { password: { columns: { hash: true } } },
	});
	const passwordValid = bcrypt.compareSync(password, user?.password.hash ?? '');

	if (!user || !passwordValid) {
		return json(
			{
				data: submission.reply({ formErrors: ['Invalid email or password'] }),
			},
			{ status: 400 },
		);
	}

	const { id } = user;
	const session = await sessionStorage.getSession(
		request.headers.get('cookie'),
	);
	session.set('userId', id);

	return redirect('/', {
		headers: {
			'Set-Cookie': await sessionStorage.commitSession(session),
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
