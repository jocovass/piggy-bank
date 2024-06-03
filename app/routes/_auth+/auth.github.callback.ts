import { type LoaderFunctionArgs } from '@remix-run/node';
import { and, eq } from 'drizzle-orm';
import {
	authenticator,
	getSessionExpirationDate,
	getUserFromSession,
	sessionKey,
} from '~/app/utils/auth.server';
import { authSessionStorage } from '~/app/utils/session.server';
import { redirectWithToast } from '~/app/utils/toast.server';
import { db } from '~/db/index.server';
import { connections, sessions, users } from '~/db/schema';

export async function loader({ request }: LoaderFunctionArgs) {
	const result = await authenticator
		.authenticate('github', request, {
			throwOnError: true,
		})
		.then(profile => ({ success: true, profile }) as const)
		.catch(error => ({ success: false, error }) as const);

	if (!result.success) {
		throw redirectWithToast('/login', {
			title: 'Auth failed',
			description: 'There was an error authenticating with "github".',
			type: 'error',
		});
	}

	const { profile } = result;

	const existingConnection = await db.query.connections.findFirst({
		where: and(
			eq(connections.providerName, 'github'),
			eq(connections.providerId, profile.id),
		),
		with: { user: { columns: { id: true } } },
	});

	const currentUser = await getUserFromSession(request);

	if (existingConnection && currentUser) {
		if (existingConnection.user.id === currentUser.id) {
			return redirectWithToast('/', {
				title: 'Already connected',
				description: `Your "${profile.firstName}" github account is already connected.`,
			});
		} else {
			return redirectWithToast('/', {
				title: 'Already connected',
				description: `The "${profile.firstName}" github account is already connected to another account.`,
			});
		}
	}

	if (currentUser) {
		await db.insert(connections).values({
			providerId: profile.id,
			providerName: 'github',
			userId: currentUser.id,
		});

		return redirectWithToast('/', {
			title: 'Connected',
			description: `You ${profile.firstName} github account has been connected.`,
		});
	}

	if (existingConnection) {
		return await makeSession({ request, userId: existingConnection.userId });
	}

	const user = await db.query.users.findFirst({
		columns: { id: true },
		where: eq(users.email, profile.email.toLowerCase()),
	});

	if (user) {
		await db.insert(connections).values({
			providerId: profile.id,
			providerName: 'github',
			userId: user.id,
		});

		return await makeSession({ request, userId: user.id });
	}

	const [newUser] = await db
		.insert(users)
		.values({
			email: profile.email.toLowerCase(),
			firstName: profile.firstName,
			lastName: profile.lastName,
		})
		.returning();

	await db.insert(connections).values({
		providerId: profile.id,
		providerName: 'github',
		userId: newUser.id,
	});

	return await makeSession({ request, userId: newUser.id });
}

async function makeSession({
	request,
	userId,
}: {
	request: Request;
	userId: string;
}) {
	const [session] = await db
		.insert(sessions)
		.values({
			userId,
			expirationDate: getSessionExpirationDate(),
		})
		.returning();

	const authSession = await authSessionStorage.getSession(
		request.headers.get('Cookie'),
	);
	authSession.set(sessionKey, session.id);
	return redirectWithToast(
		'/',
		{
			title: 'Auth successful',
			description: 'You have successfully authenticated with Github.',
		},
		{
			headers: {
				'Set-Cookie': await authSessionStorage.commitSession(authSession),
			},
		},
	);
}
