import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';
import { Form, NavLink, useActionData } from '@remix-run/react';
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

	return handleNewSession({
		redirectTo: '/dashboard',
		remember,
		request,
		session,
	});
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
		<div className="flex min-h-screen flex-col lg:p-8 lg:pb-16">
			<div className="flex">
				<Button asChild className="ml-auto" variant="ghost">
					<NavLink to="/signup">Signup</NavLink>
				</Button>
			</div>

			<div className="mx-auto flex w-full flex-1 flex-col justify-center space-y-6 sm:w-[350px]">
				<div className="text-center">
					<h1 className="text-2xl font-semibold tracking-tight">
						Welcome back
					</h1>
					<p className="text-sm text-muted-foreground">
						Log in to manage your finances
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

					<Field
						errors={fields.password.errors}
						inputProps={getInputProps(fields.password, { type: 'password' })}
						labelProps={{ children: 'Password', htmlFor: fields.password.id }}
					/>

					<Button type="submit" className="mt-4 w-full">
						Login
					</Button>
				</Form>

				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-background px-2 text-muted-foreground">
							Or continue with
						</span>
					</div>
				</div>

				<Form action="/auth/github" method="POST">
					<Button variant="outline" className="w-full">
						Login with GitHub
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
