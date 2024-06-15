import { createCookieSessionStorage } from '@remix-run/node';

/**
 * 10 minutes
 */
export const verificationMaxAge = 60 * 10;

/**
 * This session storage is used to store the verification related information
 * i.e. the email address while onboarding a new user.
 */
export const verifySessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'pb_varification',
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		maxAge: verificationMaxAge,
		secrets: [process.env.VERIFICATION_SESSION_SECRET],
		secure: process.env.NODE_ENV === 'production',
	},
});
