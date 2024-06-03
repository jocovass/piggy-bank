import { createCookieSessionStorage } from '@remix-run/node';

export const connectionSessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'pg_connection',
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 10 * 60,
		secrets: process.env.CONNECTION_SESSION_SECRET.split(','),
		secure: process.env.NODE_ENV === 'production',
	},
});
