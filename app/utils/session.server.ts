import { createCookieSessionStorage } from '@remix-run/node';

export const authSessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'pb_session',
		sameSite: 'lax',
		path: '/',
		secrets: [process.env.AUTH_SESSION_SECRET],
		httpOnly: process.env.NODE_ENV === 'production',
	},
});

export const sessionExpiresAtKey = 'twoFactorExpiresAt';
const originalCommitSession = authSessionStorage.commitSession;

Object.defineProperty(authSessionStorage, 'commitSession', {
	value: async function commitSession(
		...args: Parameters<typeof originalCommitSession>
	) {
		const [session, options] = args;

		if (options?.expires) {
			session.set(sessionExpiresAtKey, options.expires);
		}

		if (options?.maxAge) {
			session.set(
				sessionExpiresAtKey,
				new Date(Date.now() + options.maxAge * 1000),
			);
		}

		const expires = session.has(sessionExpiresAtKey)
			? new Date(session.get(sessionExpiresAtKey))
			: undefined;

		const setCookieHeader = await originalCommitSession(session, {
			...options,
			expires,
		});

		return setCookieHeader;
	},
});
