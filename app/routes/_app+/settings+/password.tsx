import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import { NavLink, Form, useActionData } from '@remix-run/react';
import { z } from 'zod';
import { Field } from '~/app/components/forms';
import ShieldExclamation from '~/app/components/icons/shield-exclamation';
import Spinner from '~/app/components/icons/spinner';
import { Button } from '~/app/components/ui/button';
import {
	getUserPassword,
	upsertUserPassword,
} from '~/app/data-access/password';
import { requireRecentTwoFactorAuth } from '~/app/routes/_auth+/verify.server';
import {
	comparePassowrds,
	hashPassword,
	requireUser,
} from '~/app/utils/auth.server';
import { useDelayedIsPending } from '~/app/utils/misc';
import { createToastHeader } from '~/app/utils/toast.server';
import { PasswordSchema } from '~/app/utils/validation-schemas';

const schema = z
	.object({
		currentPassword: PasswordSchema.optional(),
		password: PasswordSchema,
		confirmPassword: PasswordSchema,
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

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request);
	await requireRecentTwoFactorAuth(request, user);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: schema.superRefine(async ({ currentPassword }, ctx) => {
			const password = await getUserPassword({ userId: user.id });
			/**
			 * If the user has a password but does not provide a current password,
			 * we want fail the validation.
			 */
			if (password && !currentPassword) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Password is required',
					path: ['currentPassword'],
				});
				return;
			}

			/**
			 * If the user has a password, we need to check if the current password
			 * is valid.
			 */
			if (password && currentPassword) {
				const isValid = await comparePassowrds(currentPassword, password.hash);

				if (!isValid) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Invalid password',
						path: ['currentPassword'],
					});
					return;
				}
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

	const { password } = submission.value;
	const hash = await hashPassword(password);
	await upsertUserPassword({
		data: {
			hash,
			userId: user.id,
		},
	});

	return json(
		{ data: {} },
		{
			status: 200,
			headers: await createToastHeader({
				title: 'Success',
				description: 'Your password has been updated',
				type: 'success',
			}),
		},
	);
}

export default function Password() {
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		id: 'update-password-form',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.data,
		onValidate: ({ formData }) => {
			return parseWithZod(formData, { schema });
		},
		shouldRevalidate: 'onInput',
		shouldValidate: 'onBlur',
	});
	const isPending = useDelayedIsPending();
	const disableSaveBtn =
		!form.dirty || isPending || Boolean(Object.keys(form.allErrors).length);

	return (
		<div>
			<p className="mb-5">
				Strengthen your account by ensuring your password is strong.
			</p>
			<Form method="POST" {...getFormProps(form)} className="mb-12">
				<Field
					errors={fields.currentPassword.errors}
					inputProps={{
						...getInputProps(fields.currentPassword, { type: 'password' }),
						placeholder: 'Current password',
					}}
					labelProps={{
						children: 'Current password',
						htmlFor: fields.currentPassword.id,
					}}
				/>
				<Field
					errors={fields.password.errors}
					inputProps={{
						...getInputProps(fields.password, { type: 'password' }),
						placeholder: 'Password',
					}}
					labelProps={{
						children: 'Password',
						htmlFor: fields.password.id,
					}}
				/>
				<Field
					errors={fields.confirmPassword.errors}
					inputProps={{
						...getInputProps(fields.confirmPassword, { type: 'password' }),
						placeholder: 'Confirm password',
					}}
					labelProps={{
						children: 'Confirm password',
						htmlFor: fields.confirmPassword.id,
					}}
				/>
				<Button type="submit" disabled={disableSaveBtn}>
					Update
					{isPending && <Spinner className="ml-2" />}
				</Button>
			</Form>

			<div className="flex gap-3 rounded-md border p-4">
				<ShieldExclamation className="size-7 shrink-0 text-primary" />
				<p className="text-sm">
					Two-factor authentication adds an additional layer of security to your
					account by requiring more than just a password to sign in.{' '}
					<NavLink
						to="/settings/two-factor-auth"
						className="text-primary underline"
					>
						Enable 2FA
					</NavLink>
				</p>
			</div>
		</div>
	);
}
