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
import { Field } from '~/app/components/forms';
import { Button } from '~/app/components/ui/button';
import { sessionKey, signup } from '~/app/utils/auth.server';
import { authSessionStorage } from '~/app/utils/session.server';
import { redirectWithToast } from '~/app/utils/toast.server';
import { OnboardingSchema } from '~/app/utils/validation-schemas';
import { verifySessionStorage } from '~/app/utils/verification.server';
import { verifyRedirectToParamKey } from './verify';

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
			OnboardingSchema.transform(async (data, ctx) => {
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

	const { redirectTo, remember, session, firstName } = submission.value;
	const headers = new Headers();

	const authSession = await authSessionStorage.getSession(
		request.headers.get('Cookie'),
	);
	authSession.set(sessionKey, session.id);

	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('Cookie'),
	);

	headers.append(
		'Set-Cookie',
		await authSessionStorage.commitSession(authSession, {
			expires: remember ? session.expirationDate : undefined,
		}),
	);

	headers.append(
		'Set-Cookie',
		await verifySessionStorage.destroySession(verifySession),
	);

	return redirectWithToast(
		safeRedirect(redirectTo),
		{
			title: 'Welcome onboard!',
			description: `Hi ${firstName} hope you have fun using Piggy Bank`,
		},
		{ headers },
	);
}

export default function OnboardingRoute() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const [searchParams] = useSearchParams();
	const [form, fields] = useForm({
		id: 'onboarding-form',
		constraint: getZodConstraint(OnboardingSchema),
		defaultValue: { redirectTo: searchParams.get(verifyRedirectToParamKey) },
		lastResult: actionData?.data,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: OnboardingSchema });
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	});

	return (
		<div className="flex min-h-screen flex-col lg:p-8 lg:pb-16">
			<div className="flex">
				<Button className="ml-auto" variant="ghost">
					Light
				</Button>
			</div>

			<div className="mx-auto flex w-full flex-1 flex-col justify-center space-y-6 sm:w-[350px]">
				<div className="text-center">
					<h1 className="text-2xl font-semibold tracking-tight">
						Welcome to Piggy Bank
					</h1>
					<h2 className="mb-4 font-bold">{data.email}</h2>
					<p className="text-sm text-muted-foreground">
						Please fill out the form to complete your onboarding
					</p>
				</div>
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

					<Button type="submit" className="mt-4 w-full">
						Submit
					</Button>
				</Form>
			</div>
		</div>
	);
}
