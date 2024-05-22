import { createCookieSessionStorage } from '@remix-run/node';

export const authSessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'pb_session',
		sameSite: 'lax',
		path: '/',
		secrets: process.env.AUTH_SESSION_SECRET.split(','),
		httpOnly: process.env.NODE_ENV === 'production',
	},
});
