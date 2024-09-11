import { getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { z } from 'zod';
import { Field } from '~/app/components/forms';
import AvatarIcon from '~/app/components/icons/avatar';
import Spinner from '~/app/components/icons/spinner';
import {
	Avatar,
	AvatarImage,
	AvatarFallback,
} from '~/app/components/ui/avatar';
import { Button } from '~/app/components/ui/button';
import Camera from '~/app/components/ui/camera';
import { updateUser } from '~/app/data-access/users';
import { requireUser } from '~/app/utils/auth.server';
import { useDelayedIsPending } from '~/app/utils/misc';
import { createToastHeader } from '~/app/utils/toast.server';
import { useUser } from '~/app/utils/user';
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
	const user = useUser();
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
	const disableSaveBtn = !fields.firstName.value || !fields.lastName.value;

	return (
		<div>
			<div className="relative mb-8 inline-block">
				<Avatar className="h-36 w-36">
					<AvatarImage
						src={'https://loremflickr.com/320/240/cat'}
						alt={user.firstName}
					/>
					<AvatarFallback className="">
						<AvatarIcon className="size-28 text-foreground/10" />
					</AvatarFallback>
				</Avatar>

				<div className="absolute bottom-0 right-0">
					<input
						type="file"
						className="peer sr-only"
						id="file-upload"
						accept="image/*"
						required
					/>

					<Button
						asChild
						className="cursor-pointer rounded-full peer-valid:hidden"
						size="icon"
						variant="outline"
					>
						<label htmlFor="file-upload">
							<Camera className="size-5 text-muted-foreground" />
						</label>
					</Button>

					<Button
						asChild
						className="cursor-pointer rounded-full peer-invalid:hidden"
						size="icon"
						variant="destructive"
					>
						<label htmlFor="file-upload">
							<Camera className="size-5 text-muted-foreground" />
						</label>
					</Button>
				</div>
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
