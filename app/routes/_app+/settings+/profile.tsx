import { getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import {
	type ActionFunctionArgs,
	json,
	unstable_parseMultipartFormData,
	unstable_createMemoryUploadHandler,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { eq } from 'drizzle-orm';
import { useState } from 'react';
import { z } from 'zod';
import { Field } from '~/app/components/forms';
import AvatarIcon from '~/app/components/icons/avatar';
import { Check } from '~/app/components/icons/check';
import Spinner from '~/app/components/icons/spinner';
import Trash from '~/app/components/icons/trash';
import XMark from '~/app/components/icons/x-mark';
import {
	Avatar,
	AvatarImage,
	AvatarFallback,
} from '~/app/components/ui/avatar';
import { Button } from '~/app/components/ui/button';
import Camera from '~/app/components/ui/camera';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '~/app/components/ui/tooltip';
import { updateUser } from '~/app/data-access/users';
import { requireUser } from '~/app/utils/auth.server';
import { useDelayedIsPending } from '~/app/utils/misc';
import {
	createToastHeader,
	type ServerToastInput,
} from '~/app/utils/toast.server';
import { useUser } from '~/app/utils/user';
import { NameSchema } from '~/app/utils/validation-schemas';
import { db } from '~/db/index.server';
import { userImages } from '~/db/schema';

const updateProfileSchema = z
	.object({
		intent: z.literal('update-profile'),
	})
	.merge(NameSchema);

const MAX_SIZE = 1024 * 1024 * 3; // 3MB
const updateAvatarSchema = z.object({
	intent: z.literal('update-avatar'),
	avatar: z
		.instanceof(File)
		.refine(file => file.size > 0, 'Image is required')
		.refine(file => file.size < MAX_SIZE, 'Image is too large'),
});

const deleteAvatarSchema = z.object({
	intent: z.literal('delete-avatar'),
});

const schema = z.discriminatedUnion('intent', [
	updateProfileSchema,
	updateAvatarSchema,
	deleteAvatarSchema,
]);

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request);
	const form = await unstable_parseMultipartFormData(
		request,
		unstable_createMemoryUploadHandler({
			maxPartSize: MAX_SIZE,
		}),
	);
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

	const { intent } = submission.value;
	const toastConfig = {
		title: 'Success',
		description: 'Your profile has been updated',
		type: 'success',
	} satisfies ServerToastInput;

	if (intent === 'update-profile') {
		const { firstName, lastName } = submission.value;
		await updateUser({
			userId: user.id,
			data: {
				firstName,
				lastName,
			},
		});
	}

	if (intent === 'update-avatar') {
		const { avatar } = submission.value;

		const arrayBuffer = await avatar.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		db.transaction(async transaction => {
			await transaction
				.delete(userImages)
				.where(eq(userImages.user_id, user.id));

			await transaction.insert(userImages).values({
				user_id: user.id,
				blob: buffer,
				file_type: avatar.type,
				name: avatar.name,
				size: avatar.size,
			});
		});
		toastConfig.description = 'Your avatar has been updated';
	}

	if (intent === 'delete-avatar') {
		await db.delete(userImages).where(eq(userImages.user_id, user.id));
		toastConfig.description = 'Your avatar has been deleted';
	}

	return json(
		{ data: {} },
		{
			status: 200,
			headers: await createToastHeader(toastConfig),
		},
	);
}

export default function SettingsProfile() {
	const profileSettingsAction = useActionData<typeof action>();
	const user = useUser();
	const [profileSettingsFrom, profileSettingsFields] = useForm({
		id: 'profile-settings-form',
		constraint: getZodConstraint(schema),
		lastResult: profileSettingsAction?.data,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema });
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	});
	const [avatarForm, avatarFields] = useForm({
		id: 'avatar-form',
		constraint: getZodConstraint(schema),
		lastResult: profileSettingsAction?.data,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema });
		},
		shouldRevalidate: 'onBlur',
	});

	const [newImage, setNewImage] = useState('');

	const isPending = useDelayedIsPending({ formMethod: 'POST' });
	const disableSaveBtn =
		!profileSettingsFields.firstName.value ||
		!profileSettingsFields.lastName.value;

	return (
		<div>
			<div className="relative mb-8 inline-block">
				<Avatar className="h-36 w-36">
					<AvatarImage
						className="object-cover"
						src={newImage || `/user-image/${user?.image?.id || 'no-image'}`}
						alt={user.firstName}
					/>
					<AvatarFallback>
						<AvatarIcon className="size-28 text-foreground/10" />
					</AvatarFallback>
				</Avatar>

				<Form
					method="POST"
					encType="multipart/form-data"
					onReset={() => setNewImage('')}
					{...getFormProps(avatarForm)}
				>
					<div className="absolute bottom-0 right-0 flex items-center gap-x-2">
						<input
							{...getInputProps(avatarFields.avatar, { type: 'file' })}
							className="peer sr-only"
							accept="image/*"
							required
							tabIndex={newImage ? -1 : 0}
							onChange={event => {
								if (!event.target.files) return;

								event.preventDefault();
								const reader = new FileReader();
								reader.onload = () => {
									setNewImage(reader.result as string);
								};
								reader.readAsDataURL(event.target.files[0]);
							}}
						/>

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										asChild
										className="size-9 cursor-pointer rounded-full peer-valid:hidden"
										size="icon"
										variant="outline"
									>
										<label htmlFor={avatarFields.avatar.id}>
											<span className="sr-only">Select image</span>
											<Camera className="size-[1.125rem] text-muted-foreground" />
										</label>
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Select image</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						{user.image ? (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											className="size-9 cursor-pointer rounded-full peer-valid:hidden"
											size="icon"
											name="intent"
											value="delete-avatar"
											type="submit"
										>
											<>
												<span className="sr-only">Delete image</span>
												<Trash className="size-[1.125rem]" />
											</>
										</Button>
									</TooltipTrigger>

									<TooltipContent>
										<p>Delete image</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						) : null}

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										className="size-9 cursor-pointer rounded-full peer-invalid:hidden"
										size="icon"
										variant="outline"
										name="intent"
										value="update-avatar"
										type="submit"
										onClick={() => setNewImage('')}
									>
										<>
											<span className="sr-only">Save image</span>
											<Check className="size-[1.125rem] text-muted-foreground" />
										</>
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Save</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										className="size-9 cursor-pointer rounded-full peer-invalid:hidden"
										size="icon"
										type="reset"
									>
										<>
											<span className="sr-only">Cancel image</span>
											<XMark className="size-[1.125rem]" />
										</>
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Cancel</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</Form>
			</div>

			<Form method="POST" {...getFormProps(profileSettingsFrom)}>
				<Field
					inputProps={{
						...getInputProps(profileSettingsFields.firstName, { type: 'text' }),
						placeholder: 'First name',
					}}
					labelProps={{
						children: 'First Name',
						htmlFor: profileSettingsFields.firstName.id,
					}}
				/>

				<Field
					inputProps={{
						...getInputProps(profileSettingsFields.lastName, { type: 'text' }),
						placeholder: 'Last name',
					}}
					labelProps={{
						children: 'Last Name',
						htmlFor: profileSettingsFields.lastName.id,
					}}
				/>

				<Button
					disabled={disableSaveBtn}
					type="submit"
					name="intent"
					value="update-profile"
				>
					Save
					{isPending && <Spinner className="ml-2" />}
				</Button>
			</Form>
		</div>
	);
}
