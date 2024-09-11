import { createCookieSessionStorage } from '@remix-run/node';

export const themeStorage = createCookieSessionStorage({
	cookie: {
		name: 'pb_theme',
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		secrets: ['theme-secret'],
		secure: process.env.NODE_ENV === 'production',
	},
});

export const themeKey = 'pb_theme';
export type Theme = 'dark' | 'light';
export async function getTheme(request: Request) {
	const session = await themeStorage.getSession(request.headers.get('Cookie'));
	return session.get(themeKey) as Theme | undefined;
}

export async function setTheme(request: Request, theme: Theme) {
	const session = await themeStorage.getSession(request.headers.get('Cookie'));
	session.set(themeKey, theme);
	const cookieString = await themeStorage.commitSession(session);
	return cookieString;
}

export async function clearTheme(request: Request) {
	const session = await themeStorage.getSession(request.headers.get('Cookie'));
	session.unset(themeKey);
	const cookieString = await themeStorage.commitSession(session);
	return cookieString;
}
