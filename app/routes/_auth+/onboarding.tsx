import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
	redirect,
} from '@remix-run/node';
import {
	Form,
	useActionData,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react';
import { safeRedirect } from 'remix-utils/safe-redirect';
import { z } from 'zod';
import { Field } from '~/app/components/forms';
import { Button } from '~/app/components/ui/button';
import { sessionKey, signup } from '~/app/utils/auth.server';
import { authSessionStorage } from '~/app/utils/session.server';
import { verifySessionStorage } from '~/app/utils/verification.server';
import { verifyRedirectToParamKey } from './verify';

export const schema = z
	.object({
		firstName: z
			.string({ required_error: 'First name is required' })
			.min(3, 'Must be at least 3 charcter'),
		lastName: z
			.string({ required_error: 'Last name is required' })
			.min(3, 'Must be at least 3 charcter'),
		password: z
			.string({ required_error: 'Password is required' })
			.min(8, 'Must be at least 8 character')
			.regex(/[A-Z]/, 'Must contain uppercase letter')
			.regex(/[a-z]/, 'Must contain uppercase letter')
			.regex(/[0-9]/, 'Must contain number')
			.regex(/[.*[!#$%&?]/, 'Must contain special character'),
		confirmPassword: z.string({
			required_error: 'Confirm passowrd is required',
		}),
		remember: z.boolean().optional(),
		redirectTo: z.string().optional(),
	})
	.superRefine(({ confirmPassword, password }, ctx) => {
		if (confirmPassword !== password) {
			ctx.addIssue({
				code: 'custom',
				message: 'Passwords must match',
				path: ['confirmPassword'],
			});
		}
	});

export const onboardingEmailSessionKey = 'onboardingEmail';

async function getEmailFromSession(request: Request) {
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('Cookie'),
	);
	const email = verifySession.get(onboardingEmailSessionKey);

	if (typeof email !== 'string') {
		throw redirect('/signup', {
			headers: {
				'Set-Cookie': await verifySessionStorage.destroySession(verifySession),
			},
		});
	}

	return email;
}

export async function loader({ request }: LoaderFunctionArgs) {
	const email = await getEmailFromSession(request);
	return json({ email });
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const email = await getEmailFromSession(request);

	const submission = await parseWithZod(formData, {
		schema: intent =>
			schema.transform(async (data, ctx) => {
				if (intent !== null) return { ...data, session: null };

				const session = await signup({ ...data, email });

				return { ...data, session };
			}),
		async: true,
	});

	if (submission.status !== 'success' || !submission.value.session) {
		return json(
			{ data: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		);
	}

	const { redirectTo, remember, session } = submission.value;
	const headers = new Headers();

	const authSession = await authSessionStorage.getSession(
		request.headers.get('Cookie'),
	);
	authSession.set(sessionKey, session.id);

	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('Cookie'),
	);

	headers.set(
		'Set-Cookie',
		await authSessionStorage.commitSession(authSession, {
			expires: remember ? session.expirationDate : undefined,
		}),
	);

	headers.set(
		'Set-Cookie',
		await verifySessionStorage.destroySession(verifySession),
	);

	return redirect(safeRedirect(redirectTo), {
		headers,
	});
}

export default function OnboardingRoute() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const [searchParams] = useSearchParams();
	const [form, fields] = useForm({
		id: 'onboarding-form',
		constraint: getZodConstraint(schema),
		defaultValue: { redirectTo: searchParams.get(verifyRedirectToParamKey) },
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
				<h1 className="mb-5 text-4xl font-bold">Welcome: {data.email}</h1>
				<Form method="POST" {...getFormProps(form)}>
					<div id={form.errorId}>{form.errors}</div>

					<Field
						errors={fields.firstName.errors}
						inputProps={getInputProps(fields.firstName, { type: 'text' })}
						labelProps={{
							children: 'First name',
							htmlFor: fields.firstName.id,
						}}
					/>

					<Field
						errors={fields.lastName.errors}
						inputProps={getInputProps(fields.lastName, { type: 'text' })}
						labelProps={{
							children: 'Last name',
							htmlFor: fields.lastName.id,
						}}
					/>

					<Field
						errors={fields.password.errors}
						inputProps={getInputProps(fields.password, { type: 'password' })}
						labelProps={{
							children: 'Password',
							htmlFor: fields.password.id,
						}}
					/>

					<Field
						errors={fields.confirmPassword.errors}
						inputProps={getInputProps(fields.confirmPassword, {
							type: 'password',
						})}
						labelProps={{
							children: 'Confirm password',
							htmlFor: fields.confirmPassword.id,
						}}
					/>

					<input {...getInputProps(fields.redirectTo, { type: 'hidden' })} />

					<Button type="submit">Submit</Button>
				</Form>
			</div>
		</div>
	);
}
