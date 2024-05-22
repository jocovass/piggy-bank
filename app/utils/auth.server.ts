import { UTCDate } from '@date-fns/utc';
import bcrypt from 'bcryptjs';
import { db } from '~/db/index.server';
import { type User, type Password, sessions } from '~/db/schema';

export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30;
export const getSessionExpirationDate = () =>
	new UTCDate(Date.now() + SESSION_EXPIRATION_TIME);

export const sessionKey = 'auth_session';

export async function login({
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
