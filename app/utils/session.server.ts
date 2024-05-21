import { createCookieSessionStorage } from '@remix-run/node';

/**
 * 10 days
 */
export const sessionMaxAge = 60 * 60 * 24 * 10;

export const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'pb_session',
		sameSite: 'lax',
		path: '/',
		maxAge: sessionMaxAge,
		secrets: process.env.SESSION_SECRET.split(','),
		httpOnly: process.env.NODE_ENV === 'production',
	},
});
