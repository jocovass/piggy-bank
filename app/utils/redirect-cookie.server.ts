import * as cookie from 'cookie';

const key = 'redirectTo';

export const destroyRedirectToHeader = cookie.serialize(key, '', {
	maxAge: -1,
});

export function getRedirectCookieHeader(redirectTo: string) {
	return redirectTo && redirectTo !== '/'
		? cookie.serialize(key, redirectTo, {
				maxAge: 60 * 10,
			})
		: null;
}

export function getRedirectCookieValue(request: Request) {
	const rawCookie = request.headers.get('Cookie');
	if (!rawCookie) {
		return null;
	}
	return cookie.parse(rawCookie)[key] || null;
}
