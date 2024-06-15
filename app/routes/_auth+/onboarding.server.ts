import { redirect } from '@remix-run/node';
import { verifySessionStorage } from '~/app/utils/verification.server';
import { type User } from '~/db/schema';
import { onboardingEmailSessionKey } from './onboarding';

export async function handleOnbaordingVerification({
	email,
	request,
}: {
	email: User['email'];
	request: Request;
}) {
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	);
	verifySession.set(onboardingEmailSessionKey, email);

	throw redirect('/onboarding', {
		headers: {
			'Set-Cookie': await verifySessionStorage.commitSession(verifySession),
		},
	});
}
