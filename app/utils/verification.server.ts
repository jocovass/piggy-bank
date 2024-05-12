import { createCookieSessionStorage } from '@remix-run/node';

export const verifySessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'pb_varification',
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		secrets: process.env.VERIFICATION_SESSION_SECRET.split(','),
		secure: process.env.NODE_ENV === 'production',
	},
});
