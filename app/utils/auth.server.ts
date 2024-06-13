import { UTCDate } from '@date-fns/utc';
import { redirect } from '@remix-run/node';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Authenticator } from 'remix-auth';
import { type z } from 'zod';
import { db } from '~/db/index.server';
import {
	type User,
	type Password,
	sessions,
	users,
	passwords,
} from '~/db/schema';
import { connectionSessionStorage, providers } from './connection.server';
import { type ProviderUser } from './providers/providers';
import { authSessionStorage } from './session.server';
import { type OnboardingSchema } from './validation-schemas';

export const authenticator = new Authenticator<ProviderUser>(
	connectionSessionStorage,
);

for (const [name, provider] of Object.entries(providers)) {
	authenticator.use(provider.getAuthStrategy(), name);
}

/**
 * The session expiration time is set to 30 days.
 */
export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30;
export const getSessionExpirationDate = () =>
	new UTCDate(Date.now() + SESSION_EXPIRATION_TIME);

export const sessionKey = 'auth_session';

export async function createLoginSession({
	email,
	password,
}: {
	email: User['email'];
	password: Password['hash'];
}) {
	const user = await verifyPassword({ email, password });
	if (!user) {
		return null;
	}

	const session = await db
		.insert(sessions)
		.values({
			userId: user.id,
			expirationDate: getSessionExpirationDate(),
		})
		.returning();

	return session[0];
}

export type SignupArgs = z.infer<typeof OnboardingSchema> & {
	email: User['email'];
};
export async function signup({
	email,
	firstName,
	lastName,
	password,
}: SignupArgs) {
	const hash = await bcrypt.hash(password, 10);
	const session = await db.transaction(async tx => {
		const [newUser] = await tx
			.insert(users)
			.values({
				email,
				firstName,
				lastName,
			})
			.returning();

		await tx.insert(passwords).values({
			hash,
			userId: newUser.id,
		});

		const [session] = await tx
			.insert(sessions)
			.values({
				expirationDate: getSessionExpirationDate(),
				userId: newUser.id,
			})
			.returning();

		return session;
	});

	return session;
}

export async function verifyPassword({
	email,
	password,
}: {
	email: User['email'];
	password: Password['hash'];
}) {
	const user = await db.query.users.findFirst({
		where: (user, { eq }) => eq(user.email, email),
		with: { password: { columns: { hash: true } } },
	});

	if (!user || !user.password) {
		return null;
	}

	const isValid = await bcrypt.compare(password, user.password.hash);

	if (!isValid) {
		return null;
	}

	return user;
}

export async function getSessionWithUser(sessionId: string) {
	return await db.query.sessions.findFirst({
		columns: { id: true },
		where: (session, { eq, and, gt }) =>
			and(eq(session.id, sessionId), gt(session.expirationDate, new UTCDate())),
		with: { user: true },
	});
}

export async function getUserFromSession(request: Request) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	);
	const sessionId = authSession.get(sessionKey);

	const sessionWithUser = sessionId
		? await getSessionWithUser(sessionId)
		: null;

	if (sessionId && (!sessionWithUser || !sessionWithUser?.user)) {
		throw redirect('/login', {
			headers: {
				'set-cookie': await authSessionStorage.destroySession(authSession),
			},
		});
	}

	return sessionWithUser?.user || null;
}

export async function requireUser(request: Request) {
	const user = await getUserFromSession(request);

	if (!user) {
		throw redirect('/login');
	}

	return user;
}

export async function requireAnonymus(request: Request) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('Cookie'),
	);
	const sessionId = authSession.get(sessionKey);

	if (!sessionId) {
		return;
	}

	const sessionWithUser = sessionId
		? await getSessionWithUser(sessionId)
		: null;

	if (sessionWithUser && sessionWithUser.user) {
		throw redirect('/');
	}

	/**
	 * If a session exists but does not belong to any user, we want to delete the
	 * session from the database to remove any dangling session records.
	 */
	if (sessionWithUser && !sessionWithUser.user) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));

		throw redirect('/login', {
			headers: {
				'Set-Cookie': await authSessionStorage.destroySession(authSession),
			},
		});
	}

	return;
}
