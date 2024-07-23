import { redirect, type ActionFunctionArgs } from '@remix-run/node';
import { eq } from 'drizzle-orm';
import { sessionKey } from '~/app/utils/auth.server';
import { authSessionStorage } from '~/app/utils/session.server';
import { db } from '~/db/index.server';
import { sessions } from '~/db/schema';

export async function loader() {
	return redirect('/overview');
}

export async function action({ request }: ActionFunctionArgs) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('Cookie'),
	);
	const sessionId = authSession.get(sessionKey);
	if (sessionId) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
	}

	return redirect('/login', {
		headers: {
			'Set-Cookie': await authSessionStorage.destroySession(authSession),
		},
	});
}
