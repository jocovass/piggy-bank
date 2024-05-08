import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import { type ActionFunctionArgs, json, redirect } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { z } from 'zod';
import { Field } from '~/app/components/forms';
import { Button } from '~/app/components/ui/button';
import { db } from '~/db/index.server';

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
				where: (user, { eq }) => eq(user.id, data.email),
			});

			if (!existingUser) {
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

	return redirect('/');
}

export default function SignupRoute() {
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		constraint: getZodConstraint(schema),
		lastResult: actionData?.data,
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	});

	console.log(actionData);
	return (
		<div className="flex w-full items-center justify-center py-52">
			<div>
				<h1 className="mb-5 text-4xl font-bold">Signup</h1>
				<Form method="POST" {...getFormProps(form)}>
					<div id={form.errorId}>{form.errors}</div>
					<Field
						inputProps={{
							...getInputProps(fields.email, { type: 'email' }),
							autoComplete: 'email',
							autoFocus: true,
							className: 'text-red-400',
						}}
						labelProps={{ children: 'Email', htmlFor: fields.email.id }}
					/>

					<Button type="submit">Submit</Button>
				</Form>
			</div>
		</div>
	);
}