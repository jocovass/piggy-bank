import { type Submission } from '@conform-to/react';
import { json, redirect } from '@remix-run/node';
import invariant from 'tiny-invariant';
import { type z } from 'zod';
import { getUser, updateUser } from '~/app/data-access/users';
import { type VerifySchema } from '~/app/routes/_auth+/verify';
import { createToastHeader } from '~/app/utils/toast.server';
import { verifySessionStorage } from '~/app/utils/verification.server';
import { newEmaailVerifySessionKey } from './email';

export async function handleChangeEmailVerification({
	submission,
	request,
}: {
	request: Request;
	submission: Submission<z.infer<typeof VerifySchema>, string[]>;
}) {
	invariant(submission.status === 'success', 'Submission should be successful');
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	);
	const email = verifySession.get(newEmaailVerifySessionKey);

	const toastHeader = await createToastHeader({
		title: 'Error',
		description: 'Email is required',
		type: 'error',
	});

	if (!email) {
		throw json(null, {
			headers: toastHeader,
			status: 400,
		});
	}

	const user = await getUser({ userId: submission.value.target });
	if (!user) {
		throw new Error('User does not exist');
	}

	await updateUser({
		userId: user.id,
		data: {
			email,
		},
	});

	return redirect('/settings/email', {
		headers: {
			'Set-Cookie': await verifySessionStorage.destroySession(verifySession),
		},
	});
}
