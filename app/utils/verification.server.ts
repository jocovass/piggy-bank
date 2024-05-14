import { createCookieSessionStorage } from '@remix-run/node';

/**
 * 10 minutes
 */
export const verificationMaxAge = 60 * 10;

export const verifySessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'pb_varification',
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		maxAge: verificationMaxAge,
		secrets: process.env.VERIFICATION_SESSION_SECRET.split(','),
		secure: process.env.NODE_ENV === 'production',
	},
});
