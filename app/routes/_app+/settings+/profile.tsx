import { getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { z } from 'zod';
import { Field } from '~/app/components/forms';
import Spinner from '~/app/components/icons/spinner';
import { Button } from '~/app/components/ui/button';
import { updateUser } from '~/app/data-access/users';
import { requireUser } from '~/app/utils/auth.server';
import { useDelayedIsPending } from '~/app/utils/misc';
import { createToastHeader } from '~/app/utils/toast.server';
import { NameSchema } from '~/app/utils/validation-schemas';

const schema = z
	.object({
		intent: z.enum(['update-name']),
	})
	.merge(NameSchema);

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request);
	const form = await request.formData();
	const submission = await parseWithZod(form, {
		schema,
		async: true,
	});

	if (submission.status !== 'success') {
		return json(
			{ data: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		);
	}

	const { firstName, lastName } = submission.value;

	await updateUser({
		userId: user.id,
		data: {
			firstName,
			lastName,
		},
	});

	return json(
		{ data: {} },
		{
			status: 200,
			headers: await createToastHeader({
				title: 'Profile updated',
				description: 'Your profile has been updated',
				type: 'success',
			}),
		},
	);
}

export default function SettingsProfile() {
	const profileSettingsFetcher = useActionData<typeof action>();
	const [form, fields] = useForm({
		id: 'profile-settings-form',
		constraint: getZodConstraint(NameSchema),
		lastResult: profileSettingsFetcher?.data,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema });
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	});
	const isPending = useDelayedIsPending({ formMethod: 'POST' });
	console.log(isPending);

	const disableSaveBtn = !fields.firstName.value || !fields.lastName.value;

	return (
		<div>
			<div className="mb-8 h-28 w-28 rounded-full bg-foreground/10 p-2 ring-offset-background">
				<p className="sr-only">Placeholder for profile image</p>
			</div>

			<Form method="POST" {...getFormProps(form)}>
				<Field
					inputProps={{
						...getInputProps(fields.firstName, { type: 'text' }),
						placeholder: 'First name',
					}}
					labelProps={{
						children: 'First Name',
						htmlFor: fields.firstName.id,
					}}
				/>

				<Field
					inputProps={{
						...getInputProps(fields.lastName, { type: 'text' }),
						placeholder: 'Last name',
					}}
					labelProps={{
						children: 'Last Name',
						htmlFor: fields.lastName.id,
					}}
				/>

				<Button
					disabled={disableSaveBtn}
					type="submit"
					name="intent"
					value="update-name"
				>
					Save
					{isPending && <Spinner className="ml-2" />}
				</Button>
			</Form>
		</div>
	);
}
